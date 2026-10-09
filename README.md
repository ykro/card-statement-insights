# Card Statement Insights (`card-statement-insights`)

Analizador ejecutivo y progresivo de estados de cuenta de tarjetas de crédito bimonetarios (`GTQ Q` y `USD $`) con arquitectura **Privacy-First**: **funciona desde 1 solo estado de cuenta PDF (`1/3`)** ofreciendo desglose simultáneo en Quetzales y Dólares, separación de Extrafinanciamientos y decisiones cuantificadas, y **desbloquea el Motor de Tendencias Trimestrales al cargar 3 o más estados de cuenta (`3/3`)**.

> **Demo en Vivo (Producción en Vercel):** [**https://card-statement-insights.vercel.app**](https://card-statement-insights.vercel.app)
>
> **Especificación del Proyecto:** [`SPEC.md`](./SPEC.md) · **Guía de Onboarding:** [`docs/ONBOARDING.md`](./docs/ONBOARDING.md) · **Arquitectura y Privacidad:** [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
>
> **Índice General de Prototipos:** [`ykro/ilab-aibuilders-prototypes`](https://github.com/ykro/ilab-aibuilders-prototypes)

---

## Diseño de Dos Pantallas y Experiencia Progresiva (1 a 3+ PDFs)

La interfaz separa estrictamente la **Pantalla 1 (Ingesta de PDFs)** de la **Pantalla 2 (Dashboard Ejecutivo de Decisiones y Tendencias)** para evitar saturación visual, mostrando en simultáneo los consumos en Quetzales (`Q`), los consumos internacionales/digitales en Dólares (`$`) y las cuotas de Extrafinanciamiento (`FIN/CT` y `FIN/IN`):

| Nivel de Carga | Modo Activo | Qué Desbloquea Inmediatamente en el Dashboard | Acción Progresiva |
| :--- | :--- | :--- | :--- |
| **`1/3` Estados de Cuenta** | **Modo Radiografía (`snapshot-1m`)** | • KPIs simultáneos en `GTQ (Q)` (`Q11,344.19`), `USD ($)` (`$2,910.73`) y `Extrafinanciamiento` (`Q36,638.02`)<br>• Panel **Información para Decidir** con 4 decisiones cuantificadas<br>• Gráfico de velocidad semanal del corte e inercia proyectada<br>• Concentración de comercios y auditoría de suscripciones bimonetarias. | Botón directo para agregar más PDFs o simular la curva trimestral de 3 meses. |
| **`2/3` Estados de Cuenta** | **Modo Comparativo (`comparative-2m`)** | • Todo lo anterior + **Variación Mes contra Mes ($\Delta\%_{\text{MoM}}$)** en gasto regular y por categoría<br>• Detección temprana de incrementos en cargos automáticos. | Invitación a agregar 1 estado de cuenta más para confirmar tendencias estructurales de 3 cortes. |
| **`3/3+` Estados de Cuenta** | **Modo Tendencias Completo (`trends-3m`)** | • **Gráfico de Evolución Trimestral (`Jul → Ago → Sep`)** por categoría<br>• **Alertas de *Lifestyle Creep*** (categorías con 2 alzas consecutivas $>4\%$ y crecimiento $>12\%$)<br>• **Detector de Inflación Silenciosa en Suscripciones** (`Tigo`, `Apple.com/bill`, `Claude`, `Netflix`). | Indicador de **Tendencia Trimestral Activa (`3 MESES`)**. |

---

## Diagramas de Arquitectura y Flujo del Sistema

### Diagrama 1: Arquitectura Privacy-First de Descompresión PDF (`zlib FlateDecode`) y Motor Bimonetario

![Arquitectura Privacy-First de Ingesta PDF y Motor Bimonetario](./docs/diagrams/privacy-ingestion-architecture.svg)

---

### Diagrama 2: Progresión de Estados desde Pantalla de Carga hasta Motor de Tendencias 3M

![Progresión de Estados de Experiencia Progresiva](./docs/diagrams/progressive-experience-states.svg)

---

### Diagrama 3: Separación de Flujos Bimonetarios (`GTQ Q` + `USD $` + `Extrafinanciamiento`) hacia Decisiones

![Flujo de Separación Bimonetaria y Decisiones](./docs/diagrams/bimonetary-decision-flow.svg)

---

## Inicio Rápido y Documentación Detallada

```bash
npm install
npm run dev
# Abre http://localhost:3000
```

- **Guía paso a paso para probar los modos `1/3` y `3/3`, subir PDFs reales y usar el panel de Decisiones:** Lee [`docs/ONBOARDING.md`](./docs/ONBOARDING.md).
- **Detalle del extractor de flujos PDF (`src/lib/pdf-statement-parser.ts`), anonimización PII y formulación matemática:** Lee [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).
- **Especificación funcional de diseño progresivo:** Lee [`SPEC.md`](./SPEC.md).
