import { NextRequest, NextResponse } from "next/server";
import {
  CardStatement,
  CurrencyCode,
  ExpenseCategory,
  GTQ_PER_USD,
  StatementTransaction,
  convertExtractedPdfToCardStatement,
  normalizeDirtyMerchantName,
  parseUploadedStatementText,
} from "@/lib/statementAnalyzer";
import {
  extractTokensFromPdfBuffer,
  parsePdfStatementBuffer,
  redactPiiFromText,
} from "@/lib/pdf-statement-parser";

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
  "Viajes y Experiencias",
  "Compras y Cuotas (MSI)",
  "Salud y Farmacia",
  "Extrafinanciamiento y Cuotas",
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

const COMPACT_TEXT_EXTRACTION_PROMPT = `Analiza el texto extraído de este estado de cuenta de tarjeta de crédito bimonetario (GTQ y USD) y devuelve EXCLUSIVAMENTE un objeto JSON válido con esta estructura:
{
  "monthKey": "YYYY-MM",
  "monthLabel": "Mes YYYY (ej. Septiembre 2026)",
  "shortMonth": "Abreviatura de 3 letras (ej. Sep)",
  "cardAlias": "Banco y tarjeta con últimos 4 dígitos",
  "statementPeriod": "Corte DD/MM/YYYY · Pago DD/MM/YYYY",
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "rawDescriptor": "Texto original del comercio",
      "normalizedMerchant": "Nombre limpio del comercio",
      "category": "Supermercado y Despensa | Delivery y Restaurantes | Gastos Hormiga y Cafés | Transporte y Combustible | Suscripciones y Servicios | Viajes y Experiencias | Compras y Cuotas (MSI) | Salud y Farmacia | Extrafinanciamiento y Cuotas",
      "originalCurrency": "GTQ o USD",
      "originalAmount": 125.50,
      "isRecurring": false,
      "isAntExpense": false,
      "isExtrafinanciamiento": false
    }
  ]
}
Reglas:
- Conserva la moneda original ("GTQ" o "USD") y el monto exacto en "originalAmount".
- Ignora pagos a la tarjeta ("GRACIAS POR SU PAGO", "SU PAGO").
- Marca "isExtrafinanciamiento": true en cargos FIN/CT y FIN/IN.`;

async function callGeminiWithCompactText(
  compactText: string,
  fileName: string,
  apiKey: string,
  indexOffset: number
): Promise<CardStatement | null> {
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
            contents: [
              {
                parts: [
                  { text: COMPACT_TEXT_EXTRACTION_PROMPT },
                  {
                    text: `Archivo (${redactPiiFromText(fileName)}):\n${compactText.slice(0, 24000)}`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: "application/json",
            },
          }),
          signal: AbortSignal.timeout(12000),
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
          const rawDesc = redactPiiFromText(String(
            tx.rawDescriptor || tx.normalizedMerchant || "Consumo Tarjeta"
          ));
          const normInfo = normalizeDirtyMerchantName(rawDesc);
          const cleanMerchant = redactPiiFromText(String(
            tx.normalizedMerchant || normInfo.normalizedMerchant
          ));
          const origCurr: CurrencyCode =
            String(tx.originalCurrency || "GTQ").toUpperCase() === "USD"
              ? "USD"
              : "GTQ";
          const origAmt = Math.abs(
            Number(tx.originalAmount ?? tx.amountGTQ ?? tx.amount ?? 0)
          );
          const amountGTQ =
            origCurr === "USD"
              ? Number((origAmt * GTQ_PER_USD).toFixed(2))
              : origAmt;

          return {
            id: `ai-${indexOffset}-${idx}`,
            date: String(tx.date || "2026-09-15"),
            rawDescriptor: rawDesc,
            normalizedMerchant: cleanMerchant,
            category: coerceCategory(
              typeof tx.category === "string" ? tx.category : undefined,
              cleanMerchant
            ),
            originalCurrency: origCurr,
            originalAmount: origAmt,
            amountGTQ: isNaN(amountGTQ) ? 0 : amountGTQ,
            isRecurring: Boolean(tx.isRecurring ?? normInfo.isRecurring),
            isAntExpense: Boolean(
              tx.isAntExpense ?? (normInfo.isAntExpense || amountGTQ <= 85)
            ),
            isExtrafinanciamiento: Boolean(
              tx.isExtrafinanciamiento ?? normInfo.isExtrafinanciamiento
            ),
          };
        })
        .filter((tx: StatementTransaction) => tx.amountGTQ > 0);

      if (transactions.length === 0) continue;

      return {
        id: `stmt-ai-${Date.now()}-${indexOffset}`,
        monthKey: String(parsed.monthKey || "2026-09"),
        monthLabel: String(
          parsed.monthLabel || fileName.replace(/\.[^.]+$/, "")
        ),
        shortMonth: String(parsed.shortMonth || "Sep").slice(0, 4),
        cardAlias: String(parsed.cardAlias || "Tarjeta Analizada"),
        statementPeriod: String(parsed.statementPeriod || fileName),
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
    const diagnostics: {
      fileName: string;
      parseDurationMs: number;
      gtqCount: number;
      usdCount: number;
      extrafCount: number;
    }[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const slotIndex = (body.existingCount ?? 0) + i;
      const rawBuffer = Buffer.from(file.base64Data, "base64");
      const isPdf =
        file.mimeType === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf") ||
        rawBuffer.subarray(0, 5).toString("latin1") === "%PDF-";

      let extracted: CardStatement | null = null;

      // 1. Fast (< 20ms) native PDF stream decompression & bimonetary parser
      if (isPdf) {
        const pdfResult = parsePdfStatementBuffer(rawBuffer, file.name);
        if (pdfResult.isPdfParsed) {
          extracted = convertExtractedPdfToCardStatement(pdfResult, slotIndex);
          diagnostics.push({
            fileName: file.name,
            parseDurationMs: pdfResult.parseDurationMs,
            gtqCount: pdfResult.regularTransactionsGtq.length,
            usdCount: pdfResult.regularTransactionsUsd.length,
            extrafCount: pdfResult.extrafinanciamientoTransactions.length,
          });
        } else if (apiKey) {
          // If PDF has text tokens in a different bank format, pass compact text tokens (~3 KB) to Gemini
          const tokens = extractTokensFromPdfBuffer(rawBuffer);
          const compactText = redactPiiFromText(tokens.map((t) => t.text).join(" | "));
          if (compactText.length > 40) {
            extracted = await callGeminiWithCompactText(
              compactText,
              file.name,
              apiKey,
              slotIndex
            );
          }
        }
      } else if (apiKey) {
        // Plain text or CSV with optional Gemini enrichment
        const decodedText = redactPiiFromText(rawBuffer.toString("utf-8"));
        extracted = await callGeminiWithCompactText(
          decodedText,
          file.name,
          apiKey,
          slotIndex
        );
      }

      // 2. Deterministic fallback for CSV / TXT / PDF buffer
      if (!extracted) {
        const rawText = redactPiiFromText(rawBuffer.toString("utf-8"));
        extracted = parseUploadedStatementText(
          rawText,
          file.name,
          slotIndex,
          rawBuffer
        );
      }

      statements.push(extracted);
    }

    return NextResponse.json({
      ok: true,
      statements,
      diagnostics,
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
