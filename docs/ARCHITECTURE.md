# Arquitectura Técnica: Extractor PDF `FlateDecode`, Redacción PII y Motor Bimonetario

Este documento describe la arquitectura interna de **Card Statement Insights**, implementada en [`src/lib/pdf-statement-parser.ts`](../src/lib/pdf-statement-parser.ts), [`src/lib/statementAnalyzer.ts`](../src/lib/statementAnalyzer.ts), [`src/lib/demoStatements.ts`](../src/lib/demoStatements.ts) y el endpoint [`src/app/api/analyze-statements/route.ts`](../src/app/api/analyze-statements/route.ts).

---

## 1. Pipeline de Descompresión PDF y Separación Bimonetaria (`src/lib/pdf-statement-parser.ts`)

![Arquitectura Privacy-First de Ingesta PDF y Motor Bimonetario](./diagrams/privacy-ingestion-architecture.svg)

Los estados de cuenta bancarios en PDF (como MasterCard Black / Visa de Banco Industrial, BAC, G&T) almacenan el texto comprimido dentro de objetos `/FlateDecode` junto con imágenes de fondo pesadas. Enviar el binario completo a un LLM multimodal provoca latencias superiores a 20 segundos.

Para resolverlo de raíz sin dependencias nativas que fallen en entornos serverless:

1. **Descompresión de Streams con `zlib.inflateSync`:**
   - El parser localiza cada bloque `stream ... endstream` en el buffer PDF y descomprime los flujos `/FlateDecode` en memoria en **menos de 10 milisegundos**.
2. **Decodificación de Operadores `Tj`, `TJ` y Coordenadas `Td`:**
   - Extrae secuencias de texto decodificando escapes octales (`\323` → `Ó`, `\315` → `Í`) y registra el desplazamiento horizontal `dx` de cada celda numérica.
   - Distingue automáticamente cargos/compras (`dx < 340`, columna Débitos) de pagos/abonos (`dx >= 340` o descriptores `GRACIAS POR SU PAGO`, columna Créditos).
3. **Partición en 3 Libros Simultáneos:**
   - **Movimientos en Quetzales (`GTQ`):** Compras locales regulares (ej. 58 transacciones por `Q11,344.19`).
   - **Movimientos en Dólares (`USD`):** Compras internacionales y suscripciones digitales (ej. 35 transacciones por `$2,910.73`).
   - **Extrafinanciamientos (`FIN/CT` y `FIN/IN`):** Cuotas estructuradas de capital e interés (ej. 8 cargos por `Q36,638.02`), aisladas en su propio canal para no distorsionar la distribución porcentual del estilo de vida mensual.

![Flujo de Separación Bimonetaria y Decisiones](./diagrams/bimonetary-decision-flow.svg)

---

## 2. Sanitización Determinista de PII y Normalización de Comercios

### 2.1 Redacción Local de Datos Sensibles (`redactPiiAndNormalizeText`)

| Tipo de Dato Sensible (PII) | Patrón Detectado | Token Sanitizado |
| :--- | :--- | :--- |
| **Número de Tarjeta / Máscara PAN** | `\b(?:XXXX\s+){3}(\d{4})\b` | `[TARJETA-****-$1]` |
| **Identificación Tributaria (NIT Guatemala)** | `\bNIT[\s:]*\d{5,10}-?[0-9Kk]\b` | `NIT: [REDACTADO-LOCAL]` |
| **Documento Personal de Identificación (DPI)** | `\bDPI[\s:]*\d{4}\s?\d{5}\s?\d{4}\b` | `DPI: [REDACTADO-LOCAL]` |
| **Nombre del Titular** | `//\d+\s+\|\s+\d{2}/\d{2}\s+\|\s+([A-Z\s]+)` | `Titular: [TITULAR-ANONIMIZADO]` |
| **Dirección / Domicilio Fiscal** | `CALZADA ... ZONA ... GUATEMALA` | `Dirección: [DOMICILIO-REDACTADO-LOCALMENTE]` |

### 2.2 Normalización de Descriptores Bancarios (`normalizeDirtyMerchantName`)
- `DLC*UBER RIDES NLD` / `DLC*UBER RIDES USA` / `DLO*UBER RIDES MEX` → **`Uber Rides (Viajes)`** (`Transporte y Combustible`, `isAntExpense = true`)
- `COFIQO STAHL Y COMPAQ GTM` → **`Cofiño Stahl (Servicio Automotriz)`** (`Transporte y Combustible`)
- `GASTOS MEDICOS-EL ROBLE` → **`Seguros El Roble (Gastos Médicos)`** (`Salud y Farmacia`, `isRecurring = true`)
- `AIRBNB * HMJJKEX4BA GBR` → **`Airbnb (Alojamiento Internacional)`** (`Viajes y Experiencias`)
- `ANTHROPIC* CLAUDE SUB USA` → **`Anthropic Claude Pro/Max`** (`Suscripciones y Servicios`, `isRecurring = true`)
- `FIN/CT ...` / `FIN/IN ...` → **`Extrafinanciamiento BI (Capital / Interés)`** (`Extrafinanciamiento y Cuotas`, `isExtrafinanciamiento = true`)

---

## 3. Formulación Matemática del Motor de Tendencias (1M → 2M → 3M)

![Progresión de Estados de Experiencia Progresiva](./diagrams/progressive-experience-states.svg)

Sea $S = [s_1, s_2, \dots, s_n]$ la secuencia de estados de cuenta ordenados cronológicamente por `monthKey` (`YYYY-MM`), donde $n \in \{1, 2, 3+\}$.

### 3.1 Consolidación Bimonetaria Sin Pérdida de Moneda Nativa
Cada transacción $t$ conserva su moneda original $\text{curr}(t) \in \{\text{GTQ}, \text{USD}\}$ y su monto nativo $M_{\text{nat}}(t)$. Para cada categoría $c$ y corte $k$:

$$G_{c,k}^{\text{GTQ}} = \sum_{t \in s_k,\, \text{cat}(t)=c,\, \text{curr}(t)=\text{GTQ}} M_{\text{nat}}(t), \qquad G_{c,k}^{\text{USD}} = \sum_{t \in s_k,\, \text{cat}(t)=c,\, \text{curr}(t)=\text{USD}} M_{\text{nat}}(t)$$

El volumen consolidado equivalente en Quetzales emplea la tasa de referencia $\tau = 7.75$:

$$G_{c,k}^{\text{cons}} = G_{c,k}^{\text{GTQ}} + \tau \cdot G_{c,k}^{\text{USD}}$$

### 3.2 Detección de *Lifestyle Creep* en 3 Cortes
Una categoría $c$ activa una alerta de crecimiento sostenido (`LifestyleCreepAlert`) cuando en $n \ge 3$ cortes consecutivos cumple:

$$G_{c,2}^{\text{cons}} > 1.04 \cdot G_{c,1}^{\text{cons}} \quad \wedge \quad G_{c,3}^{\text{cons}} > 1.04 \cdot G_{c,2}^{\text{cons}} \quad \wedge \quad \frac{G_{c,3}^{\text{cons}} - G_{c,1}^{\text{cons}}}{G_{c,1}^{\text{cons}}} > 12\%$$

### 3.3 Generación de Decisiones Ejecutivas (`ExecutiveDecisionItem`)
El motor evalúa cuatro vectores sobre las transacciones extraídas para construir el panel **Información para Decidir**:
1. **Frecuencia de Micro-Movilidad y Gastos Hormiga:** Conteo de viajes en app (`Uber Rides`) y micro-consumos menores a `Q85` / `$11 USD`.
2. **Auditoría de Suscripciones Bimonetarias y Cobros Múltiples:** Suma de cargos recurrentes en `USD` (`Anthropic Claude`, `Apple.com/bill`, `Netflix`, `Spotify`) y `GTQ` (`Tigo`, `Seguros El Roble`, `Membresía Club BI`).
3. **Costo Financiero de Extrafinanciamientos (`FIN/IN` vs `FIN/CT`):** Desglose entre la cuota que amortiza capital (`FIN/CT`) y la cuota que paga intereses mensuales (`FIN/IN`) para priorizar abonos extraordinarios a capital.
4. **Optimización de Delivery y Exposición Cambiaria en Viajes (`USD`).**
