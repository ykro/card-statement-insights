# Especificación del Proyecto: Card Statement Insights (Bimonetary 1-to-3+ Statements Analyzer)

**Objetivo:** Construir un analizador ejecutivo de estados de cuenta de tarjetas de crédito bimonetarios (`GTQ Q` y `USD $`) que **separe la pantalla de carga de la pantalla de resultados**, **funcione en menos de 50 ms desde el primer estado de cuenta PDF**, y **desbloquee la detección de tendencias multi-mes al cargar 3 o más cortes**.

- **Índice General de Prototipos:** [`ykro/ilab-aibuilders-prototypes`](https://github.com/ykro/ilab-aibuilders-prototypes)

---

## 1. Experiencia Progresiva y Separación en Dos Pantallas

La aplicación organiza el flujo en dos vistas dedicadas (`screen === "upload"` y `screen === "dashboard"`):

| Cantidad de Archivos Subidos | Modo del Dashboard | Qué ve el usuario (Outputs) | Acción Progresiva |
| :--- | :--- | :--- | :--- |
| **1 Estado de Cuenta PDF** | **Modo Radiografía (`snapshot-1m`)** | • 4 KPIs simultáneos: Consumo Regular `GTQ (Q)`, Consumo Internacional/Digital `USD ($)`, Total Consolidado y `Extrafinanciamiento / Cuotas`<br>• Panel **Información para Decidir** con 4 decisiones cuantificadas y simulador interactivo<br>• Gráfico de velocidad semanal (`Sem 1` a `Sem 4`) e inercia proyectada<br>• Concentración de comercios (Pareto) y desglose `FIN/CT` vs `FIN/IN`. | Botón superior para agregar más estados de cuenta PDF o activar la simulación de tendencia de 3 meses (`Jul – Sep 2026`). |
| **2 Estados de Cuenta PDF** | **Modo Comparativo (`comparative-2m`)** | • Todo lo anterior + Variación porcentual Mes 1 vs. Mes 2 ($\Delta\%_{\text{MoM}}$). | Indicador `2 meses cargados`: invitación a subir 1 corte adicional para confirmar tendencias trimestrales. |
| **3+ Estados de Cuenta PDF** | **Modo Tendencias Completo (`trends-3m`)** | • **Gráfico de Evolución Trimestral (`Jul → Ago → Sep`) por categoría**<br>• **Alerta de *Lifestyle Creep*** (categorías con 2 alzas consecutivas)<br>• **Detector de Inflación Silenciosa y cobros múltiples en Suscripciones**. | Indicador activo: **3 MESES (TENDENCIA ACTIVA)**. |

---

## 2. Arquitectura Técnica: Extractor `zlib FlateDecode` + Motor Bimonetario

![Arquitectura Privacy-First de Ingesta PDF y Motor Bimonetario](./docs/diagrams/privacy-ingestion-architecture.svg)

### Componentes Principales
1. **Extractor Nativo de Flujos PDF (`src/lib/pdf-statement-parser.ts`):**
   - Descomprime flujos `/FlateDecode` utilizando `zlib.inflateSync` de Node.js en `< 10 ms` sin dependencias binarias externas.
   - Evalúa operadores de posición (`Td`, `TD`, `Tm`) y texto (`Tj`, `TJ`) para distinguir cargos en columna de débito (`dx < 340`) frente a abonos/pagos en columna de crédito (`dx >= 340`).
   - Separa automáticamente `MOVIMIENTOS EN QUETZALES`, `MOVIMIENTOS EN DOLARES` y `EXTRAFINANCIAMIENTOS`.
2. **Redacción PII Local y Normalización (`src/lib/statementAnalyzer.ts`):**
   - Anonimiza número de tarjeta, nombre del titular, NIT y dirección postal antes de cualquier procesamiento externo.
   - Limpia descriptores bancarios (`DLC*UBER RIDES NLD`, `COFIQO STAHL Y COMPAQ GTM`, `PP*APPLE.COM/BILL USA`) y los agrupa por entidad comercial.
3. **Enriquecimiento Compacto (`src/app/api/analyze-statements/route.ts`):**
   - Procesa primero con el parser determinista de alta velocidad y utiliza `gemini-3.8-flash` sobre texto compacto (~3 KB) como respaldo para formatos no estándar.

---

## 3. Estructura Visual del Dashboard Ejecutivo (Pantalla 2)

1. **Barra Superior de Navegación:** Botón **"Subir o agregar estados de cuenta"** para volver a la Pantalla 1, metadatos del corte (`Fecha de corte`, `Fecha de pago`, tiempo de extracción en ms) y selector rápido `1 mes` vs `3 meses`.
2. **Fila 01 — Radiografía Bimonetaria Simultánea:** 4 tarjetas que muestran al mismo tiempo el consumo en Quetzales (`Q11,344.19`), el consumo en Dólares (`$2,910.73`), el consolidado regular (`Q33,902.35` / `$4,374.50`) y las cuotas de Extrafinanciamiento (`Q36,638.02`).
3. **Fila 02 — Información para Decidir:** 4 tarjetas de decisión ejecutiva con evidencia exacta del estado de cuenta, acción sugerida y ahorro mensual/anual interactivo.
4. **Fila 03 — Gráficos de Tendencias e Inercia:** Evolución trimestral por categoría (o velocidad semanal bimonetaria en 1M) + composición estructural `Q` vs `$` vs `Extrafinanciamiento`.
5. **Fila 04 y 05 — Indicadores de Velocidad, Concentración de Comercios y Auditoría de Suscripciones/Extrafinanciamiento.**
