import { NextRequest, NextResponse } from "next/server";
import {
  CardStatement,
  ExpenseCategory,
  StatementTransaction,
  normalizeDirtyMerchantName,
  parseUploadedStatementText,
} from "@/lib/statementAnalyzer";

interface UploadedFileInput {
  name: string;
  mimeType: string;
  base64Data: string;
}

const VALID_CATEGORIES: ExpenseCategory[] = [
  "Supermercado y Despensa",
  "Delivery y Restaurantes",
  "Gastos Hormiga y Cafés",
  "Transporte y Combustible",
  "Suscripciones y Servicios",
  "Compras y Cuotas (MSI)",
  "Salud y Farmacia",
];

function coerceCategory(raw?: string, merchant?: string): ExpenseCategory {
  if (raw && VALID_CATEGORIES.includes(raw as ExpenseCategory)) {
    return raw as ExpenseCategory;
  }
  if (merchant) {
    return normalizeDirtyMerchantName(merchant).category;
  }
  return "Compras y Cuotas (MSI)";
}

const EXTRACTION_PROMPT = `Analiza este estado de cuenta de tarjeta de crédito (PDF o texto) y extrae todos los consumos/transacciones reales.
Devuelve EXCLUSIVAMENTE un objeto JSON válido con esta estructura exacta:
{
  "monthKey": "YYYY-MM",
  "monthLabel": "Mes YYYY (ej. Septiembre 2026)",
  "shortMonth": "Abreviatura de 3 letras (ej. Sep)",
  "cardAlias": "Nombre del banco o tarjeta y últimos 4 dígitos (ej. Visa •••• 4821)",
  "statementPeriod": "Periodo del corte (ej. 15 Ago - 14 Sep)",
  "currencyDetected": "GTQ o USD",
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "rawDescriptor": "Texto original del comercio en el estado de cuenta",
      "normalizedMerchant": "Nombre limpio y legible del comercio (ej. PedidosYa, Supermercados La Torre, Netflix)",
      "category": "Una de: Supermercado y Despensa | Delivery y Restaurantes | Gastos Hormiga y Cafés | Transporte y Combustible | Suscripciones y Servicios | Compras y Cuotas (MSI) | Salud y Farmacia",
      "amountGTQ": 125.50,
      "isRecurring": false,
      "isAntExpense": false
    }
  ]
}
Reglas importantes:
- Si algún monto está en dólares (USD), conviértelo a Quetzales multiplicando por 7.75 en "amountGTQ".
- Ignora pagos a la tarjeta ("SU PAGO GRACIAS", "ABONO") y extrae únicamente cargos, compras, suscripciones o cuotas.
- Marca "isRecurring": true en suscripciones mensuales (Netflix, Spotify, iCloud, Claro, Tigo, seguros, membresías).
- Marca "isAntExpense": true en cafés, tiendas de conveniencia, snacks o compras frecuentes menores a Q95.`;

async function callGeminiWithPdfOrText(
  file: UploadedFileInput,
  apiKey: string
): Promise<CardStatement | null> {
  const isPdf =
    file.mimeType === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");

  const userParts: Record<string, unknown>[] = [{ text: EXTRACTION_PROMPT }];

  if (isPdf) {
    userParts.push({
      inlineData: {
        mimeType: "application/pdf",
        data: file.base64Data,
      },
    });
  } else {
    const decodedText = Buffer.from(file.base64Data, "base64").toString("utf-8");
    userParts.push({
      text: `Contenido del archivo (${file.name}):\n${decodedText.slice(0, 30000)}`,
    });
  }

  // Try models/gemini-3.8-flash first, then fallback to models/gemini-2.5-flash if needed
  const candidateModels = [
    "models/gemini-3.8-flash",
    "models/gemini-2.5-flash",
  ];

  for (const modelName of candidateModels) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: userParts }],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: "application/json",
            },
          }),
          signal: AbortSignal.timeout(25000),
        }
      );

      if (!response.ok) continue;

      const data = await response.json();
      const rawJson = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawJson) continue;

      const parsed = JSON.parse(rawJson);
      if (
        !parsed ||
        !Array.isArray(parsed.transactions) ||
        parsed.transactions.length === 0
      ) {
        continue;
      }

      const transactions: StatementTransaction[] = parsed.transactions
        .map((tx: Record<string, unknown>, idx: number) => {
          const rawDesc = String(
            tx.rawDescriptor || tx.normalizedMerchant || "Consumo Tarjeta"
          );
          const normInfo = normalizeDirtyMerchantName(rawDesc);
          const cleanMerchant = String(
            tx.normalizedMerchant || normInfo.normalizedMerchant
          );
          const amount = Number(tx.amountGTQ ?? tx.amount ?? 0);
          return {
            id: `pdf-${Date.now()}-${idx}`,
            date: String(tx.date || "2026-09-15"),
            rawDescriptor: rawDesc,
            normalizedMerchant: cleanMerchant,
            category: coerceCategory(
              typeof tx.category === "string" ? tx.category : undefined,
              cleanMerchant
            ),
            amountGTQ: isNaN(amount) ? 0 : Math.abs(amount),
            isRecurring: Boolean(tx.isRecurring ?? normInfo.isRecurring),
            isAntExpense: Boolean(
              tx.isAntExpense ?? (normInfo.isAntExpense || amount <= 90)
            ),
          };
        })
        .filter((tx: StatementTransaction) => tx.amountGTQ > 0);

      if (transactions.length === 0) continue;

      return {
        id: `stmt-pdf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        monthKey: String(parsed.monthKey || "2026-09"),
        monthLabel: String(
          parsed.monthLabel || file.name.replace(/\.[^.]+$/, "")
        ),
        shortMonth: String(parsed.shortMonth || "Mes").slice(0, 4),
        cardAlias: String(parsed.cardAlias || "Tarjeta Analizada"),
        statementPeriod: String(parsed.statementPeriod || file.name),
        transactions,
      };
    } catch {
      // Try next candidate model
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const apiKey = process.env.GEMINI_API_KEY || "";
    const files: UploadedFileInput[] = Array.isArray(body.files)
      ? body.files
      : [];

    if (files.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No se recibieron archivos para analizar." },
        { status: 400 }
      );
    }

    const statements: CardStatement[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let extracted: CardStatement | null = null;

      if (apiKey) {
        extracted = await callGeminiWithPdfOrText(file, apiKey);
      }

      if (!extracted) {
        // Fallback deterministic parser if text/CSV or if PDF contains readable text strings
        const rawText = Buffer.from(file.base64Data, "base64").toString(
          "utf-8"
        );
        extracted = parseUploadedStatementText(
          rawText,
          file.name,
          (body.existingCount ?? 0) + i
        );
      }

      statements.push(extracted);
    }

    return NextResponse.json({
      ok: true,
      statements,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Error al interpretar el estado de cuenta.",
      },
      { status: 500 }
    );
  }
}
