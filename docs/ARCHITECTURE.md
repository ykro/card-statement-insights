# 🛡️ Arquitectura Técnica: Redacción PII Privacy-First y Motor de Tendencias 3M

Este documento describe la arquitectura interna de **Card Statement Insights**, implementada en [`src/lib/statementAnalyzer.ts`](../src/lib/statementAnalyzer.ts), [`src/lib/demoStatements.ts`](../src/lib/demoStatements.ts) y el endpoint híbrido [`src/app/api/analyze-statements/route.ts`](../src/app/api/analyze-statements/route.ts).

---

## 1. Pipeline Privacy-First: Redacción Local de PII y Normalización (`gemma-4-e2b`)

Los estados de cuenta bancarios contienen información altamente sensible (PII) que el usuario no desea exponer sin control. La arquitectura aplica un **filtro de sanitización en dos etapas** antes de ejecutar el razonamiento financiero profundo:

### 1.1 Sanitización Determinista + Local (`redactPiiAndNormalizeText`)
Todo texto crudo proveniente de un estado de cuenta pasa por reglas de ofuscación inmediata que reemplazan identificadores personales conservando únicamente los últimos 4 dígitos para referencia del usuario:

| Tipo de Dato Sensible (PII) | Patrón Detectado | Token Sanitizado |
| :--- | :--- | :--- |
| **Número de Tarjeta (PAN 16 dígitos)** | `\b(?:\d{4}[-\s]?){3}(\d{4})\b` | `[TARJETA-****-$1]` |
| **Identificación Tributaria (NIT Guatemala)** | `\bNIT[\s:]*\d{5,10}-?[0-9Kk]\b` | `NIT: [REDACTADO-LOCAL]` |
| **Documento Personal de Identificación (DPI)** | `\bDPI[\s:]*\d{4}\s?\d{5}\s?\d{4}\b` | `DPI: [REDACTADO-LOCAL]` |
| **Nombre del Titular / Cliente** | `(?:Titular\|Cliente\|Nombre)[\s:]+...` | `Titular: [TITULAR-ANONIMIZADO]` |
| **Dirección / Domicilio Fiscal** | `(?:Dirección\|Domicilio)[\s:]+[^\n\r]+` | `Dirección: [DOMICILIO-REDACTADO]` |

El objeto `piiAudit` dentro del reporte registra exactamente cuántos campos fueron protegidos (`redactedFieldsCount`) y muestra en la interfaz el fragmento original vs. el fragmento anonimizado para total transparencia.

### 1.2 Limpieza de Descriptores Bancarios (`normalizeDirtyMerchantName`)
Los procesadores de tarjetas (`POS*`, `VISANET*`, `BAC*`, `CLIP*`) generan descriptores fragmentados que impiden agrupar gastos por comercio si no se normalizan primero. El clasificador transforma cada línea en una entidad canónica:
- `POS*PEDIDOSYA GUATEMALA 882` → Comercio: **`PedidosYa`** | Categoría: `Delivery y Restaurantes`
- `VISANET*LA TORRE PRADERA Z10` → Comercio: **`Supermercados La Torre`** | Categoría: `Supermercado y Despensa`
- `BAC*CAFE BARISTA FONTABELLA` → Comercio: **`Café Barista`** | Categoría: `Gastos Hormiga y Cafés` (`isAntExpense = true`)
- `SIMAN OAKLAND VISACUOTA 04/12` → Comercio: **`Almacenes Siman (Visacuotas)`** | Categoría: `Compras y Cuotas (MSI)` (`isRecurring = true`)

---

## 2. Formulación Matemática del Motor de Detección Trimestral (1M → 2M → 3M)

Sea $S = [s_1, s_2, \dots, s_n]$ la secuencia de estados de cuenta ordenados cronológicamente por `monthKey` (`YYYY-MM`), donde $n \in \{1, 2, 3+\}$.

### 2.1 Evolución y Variación por Categoría
Para cada una de las 7 categorías canónicas $c \in \mathcal{C}$ y cada mes $k \in \{1, \dots, n\}$, sea $G_{c,k}$ la suma de transacciones de la categoría $c$ en el estado de cuenta $s_k$:

$$G_{c,k} = \sum_{t \in s_k,\, \text{cat}(t)=c} \text{monto}(t)$$

1. **Variación Mensual ($\Delta\%_{\text{MoM}}$, activa desde $n \ge 2$):**
   $$\Delta\%_{\text{MoM}}(c) = \frac{G_{c,n} - G_{c,n-1}}{G_{c,n-1}} \times 100$$

2. **Crecimiento Acumulado Trimestral ($\Delta\%_{3M}$, activo en $n \ge 3$):**
   $$\Delta\%_{3M}(c) = \frac{G_{c,3} - G_{c,1}}{G_{c,1}} \times 100$$

---

### 2.2 Detección de *Lifestyle Creep* (Inflación de Estilo de Vida)
Una categoría $c$ dispara una **Alerta de *Lifestyle Creep*** (`LifestyleCreepAlert`) cuando cumple simultáneamente dos condiciones matemáticas en una ventana de 3 meses ($n \ge 3$):

1. **Crecimiento Monótono Estricto en 2 Cortes Consecutivos (`isConsecutiveGrowth`):**
   $$G_{c,2} > 1.04 \cdot G_{c,1} \quad \wedge \quad G_{c,3} > 1.04 \cdot G_{c,2}$$
   *(Cada mes supera al anterior en más de un $4\%$, descartando ruido aleatorio).*

2. **Expansión Trimestral Significativa:**
   $$\Delta\%_{3M}(c) > 15\%$$

El **Sobregasto Mensual Adicional** (`extraMonthlySpendGTQ`) atribuible al *Lifestyle Creep* se cuantifica como:

$$\text{Sobregasto}_{c} = \max(0,\; G_{c,3} - G_{c,1})$$

---

### 2.3 Detección de Inflación Silenciosa en Suscripciones (`SubscriptionAlert`)
Para todo comercio con cargos recurrentes automáticos ($t.\text{isRecurring} = \text{true}$), se compara el importe cobrado en el último corte ($P_{\text{actual}} = P_n$) contra el importe base del primer corte registrado ($P_{\text{base}} = P_1$):

$$\Delta P = P_n - P_1, \qquad \Delta P\% = \frac{P_n - P_1}{P_1} \times 100$$

Se marca **Inflación Silenciosa Activa** (`hasSilentInflation = true`) si:

$$n \ge 2 \quad \wedge \quad \Delta P \ge \text{Q}5.00\text{ (o }\approx \$0.65\text{ USD)}$$

Esto permite detectar aumentos unilaterales de tarifa en plataformas de streaming, almacenamiento en la nube o telecomunicaciones que suelen pasar desapercibidos en el cargo automático mensual.

---

### 2.4 Cuantificación de Gastos Hormiga (`antExpenses`)
Una transacción $t$ es clasificada como **Gasto Hormiga** si cumple cualquiera de los dos criterios:
1. Pertenece a un comercio de micro-consumo frecuente (`Café Barista`, `Super 24 Conveniencia`, viajes cortos).
2. Su monto unitario es menor o igual al umbral de micro-gasto y no es una suscripción fija:
   $$\text{monto}(t) \le \text{Q}95.00\text{ (}\approx \$12.25\text{ USD)} \quad \wedge \quad \neg t.\text{isRecurring}$$

El motor agrega tanto el impacto del último corte (`antExpensesCurrentMonthGTQ` y número de visitas `antExpensesVisitCount`) como el drenaje acumulado trimestral (`antExpensesThreeMonthGTQ`).

---

## 3. Esquema Estructurado JSON (`StatementAnalysisReport`)

Tanto el motor determinista como la capa de enriquecimiento IA (`/api/analyze-statements`) operan sobre un contrato TypeScript estricto:

```json
{
  "statementCount": 3,
  "analysisDepthMode": "trends-3m",
  "kpis": {
    "currentMonthTotalGTQ": 6845,
    "previousMonthTotalGTQ": 6120,
    "threeMonthAverageGTQ": 6148,
    "monthOverMonthDeltaPct": 11.8,
    "topCategory": {
      "name": "Delivery y Restaurantes",
      "amountGTQ": 2530,
      "sharePct": 36.9,
      "growthPct": 78.2
    },
    "recurringAndInstallmentsGTQ": 1345,
    "antExpensesCurrentMonthGTQ": 640,
    "antExpensesVisitCount": 11,
    "antExpensesThreeMonthGTQ": 1790
  },
  "lifestyleCreepAlerts": [
    {
      "id": "creep-0",
      "category": "Delivery y Restaurantes",
      "month1GTQ": 1420,
      "month2GTQ": 1950,
      "month3GTQ": 2530,
      "growthPct3M": 78.17,
      "extraMonthlySpendGTQ": 1110,
      "mainDriverMerchants": ["PedidosYa", "Uber Eats"]
    }
  ],
  "subscriptions": [
    {
      "merchant": "Netflix",
      "currentAmountGTQ": 109,
      "firstMonthAmountGTQ": 89,
      "priceIncreaseGTQ": 20,
      "priceIncreasePct": 22.5,
      "hasSilentInflation": true
    }
  ],
  "piiAudit": {
    "redactedFieldsCount": 12,
    "normalizedMerchantsCount": 54
  }
}
```
