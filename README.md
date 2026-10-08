# 💳 Card Statement Insights (`card-statement-insights`)

Analizador progresivo de estados de cuenta de tarjetas de crédito con enfoque **Privacy-First**: **funciona al instante desde 1 solo estado de cuenta (`1/3`)** ofreciendo una radiografía completa del mes, y **desbloquea el Motor de Tendencias Trimestrales al cargar 3 o más estados de cuenta (`3/3`)** para detectar *Lifestyle Creep*, inflación silenciosa en suscripciones y simular recortes interactivos.

> 🚀 **Demo en Vivo (Producción en Vercel):** [**https://card-statement-insights.vercel.app**](https://card-statement-insights.vercel.app)
>
> 📌 **Especificación del Proyecto:** [`SPEC.md`](./SPEC.md) · 📘 **Guía de Onboarding:** [`docs/ONBOARDING.md`](./docs/ONBOARDING.md) · 🛡️ **Arquitectura y Privacidad:** [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
>
> 🔗 **Índice General de Prototipos:** [`ykro/hackathon-prototipos-index`](https://github.com/ykro/hackathon-prototipos-index) · 🧪 **Benchmark Gemini 4 Argon & A/B Tests:** [`ykro/gemini-argon-agy-benchmark`](https://github.com/ykro/gemini-argon-agy-benchmark)

---

## 💡 Diseño de Experiencia Progresiva: Funciona con 1, Brilla con 3+

La mayoría de los usuarios abandonan las herramientas financieras si se les exige recopilar medio año de documentos antes de ver el primer gráfico. **Card Statement Insights** elimina esa barrera mediante 3 niveles de profundidad progresiva bimoneda (`GTQ Q` / `USD $`):

| Nivel de Carga | Modo Activo | Qué Desbloquea Inmediatamente en el Dashboard | Banner / Call-to-Action Progresivo |
| :--- | :--- | :--- | :--- |
| **📄 `1/3` Estados de Cuenta** | **Modo Radiografía (`snapshot-1m`)** | • Distribución porcentual por categoría<br>• Top comercios normalizados (`PedidosYa`, `La Torre`, `Café Barista`)<br>• Detector de **Gastos Hormiga** del mes y conteo de visitas<br>• Identificación de suscripciones y Visacuotas (MSI)<br>• Simulador de Ahorro con 3 acciones inmediatas. | *"📊 Estás viendo tu radiografía de 1 mes (1/3). Sube 2 estados de cuenta anteriores para activar el **Radar de Tendencias Trimestrales**."* |
| **📄📄 `2/3` Estados de Cuenta** | **Modo Comparativo (`comparative-2m`)** | • Todo lo anterior + **Variación Mes contra Mes ($\Delta\%_{\text{MoM}}$)** en gasto total y por categoría<br>• Desbloqueo de tarjeta de optimización de movilidad en el Simulador. | *"⚡ ¡Casi listo (2/3)! Agrega 1 estado de cuenta más para confirmar tendencias reales de 3 meses y descartar picos aislados."* |
| **📄📄📄 `3/3+` Estados de Cuenta** | **Modo Tendencias Completo (`trends-3m`)** | • **Gráfica de Evolución Trimestral (`Jul → Ago → Sep`)**<br>• **Alertas de *Lifestyle Creep*** (categorías con 2 alzas consecutivas $>4\%$ y crecimiento $>15\%$)<br>• **Detector de Inflación Silenciosa en Suscripciones** (`Netflix`, `iCloud+`, `Claro`)<br>• **Coach IA Trimestral (`gemini-3.8-flash` vs `gemma-4-e2b`)**. | **Badge Verde:** *"✅ Análisis de Tendencias Trimestrales Activo (3/3 meses)"*. |

---

## 🏗️ Diagramas de Arquitectura y Flujo del Sistema

### Diagrama 1: Arquitectura Privacy-First de Ingesta y Análisis Dual (`gemma-4` Redacción PII + `gemini-3.8-flash` Insights)

```mermaid
flowchart LR
    subgraph INPUT["📥 Ingesta de Estados de Cuenta"]
        I1["Selector Demo 1-Click (1/3, 2/3 o 3/3 Meses)"]
        I2["Subida de Archivos CSV / TXT de Tarjeta"]
    end

    subgraph PRIVACY["🛡️ Capa Privacy-First Local (gemma-4-e2b + Regex)"]
        P1["Redacción de PII (PAN 16 dígitos, NIT, DPI, Titular, Dirección)"]
        P2["Normalización de Comercios (POS*PEDIDOSYA -> PedidosYa)"]
        P3["Auditoría de Privacidad Transparente (piiAudit Badge)"]
    end

    subgraph ENGINE["📊 Motor Analítico y IA (/api/analyze-statements)"]
        E1["Agregación Multi-Mes y Detección de Tendencias (statementAnalyzer.ts)"]
        E2["gemini-3.8-flash: Diagnóstico Ejecutivo Trimestral y Plan de Recorte"]
        E3["gemma-4-e2b: Resumen Rápido de Privacidad y Alertas Puntuales"]
    end

    subgraph UI["🖥️ Dashboard Next.js 16 (Light Mode + GTQ/USD)"]
        U1["4 KPIs Clave + Gráficas Recharts Adaptativas (1M vs 3M)"]
        U2["Radar de Lifestyle Creep + Inflación de Suscripciones"]
        U3["Simulador Interactivo de Ahorro con Toggles en Vivo"]
    end

    I1 --> P1
    I2 --> P1
    P1 --> P2 --> P3
    P2 --> E1
    E1 <--> E2
    E1 <--> E3
    E1 --> U1
    E1 --> U2
    E1 --> U3
```

---

### Diagrama 2: Máquina de Estados de Experiencia Progresiva (Modo 1/3 Radiografía → Modo 2/3 Comparativo → Modo 3/3 Motor de Tendencias)

```mermaid
stateDiagram-v2
    [*] --> Modo_1_de_3: "Carga 1 Estado de Cuenta (ej. Septiembre)"

    state "Modo 1/3: Radiografía Mensual (snapshot-1m)" as Modo_1_de_3 {
        S1: "Desglose por Categoría + Top Comercios"
        S2: "Gastos Hormiga del Mes + Suscripciones Base"
        S3: "Banner Progresivo: 'Sube 2 más para Radar Trimestral'"
    }

    state "Modo 2/3: Comparativo Mes a Mes (comparative-2m)" as Modo_2_de_3 {
        C1: "Cálculo de Variación Mensual (Delta % MoM)"
        C2: "Pre-detección de Cambios en Cargos Recurrentes"
        C3: "Banner Progresivo: 'Falta 1 estado para confirmar tendencia'"
    }

    state "Modo 3/3: Motor de Tendencias 3M (trends-3m)" as Modo_3_de_3 {
        T1: "Gráfica Comparativa Trimestral (Mes 1 -> Mes 2 -> Mes 3)"
        T2: "Alerta de Lifestyle Creep (2 subidas consecutivas)"
        T3: "Detector de Inflación Silenciosa en Suscripciones"
        T4: "Simulador Interactivo Calibrado con Promedio 3M"
    }

    Modo_1_de_3 --> Modo_2_de_3: "+1 Estado de Cuenta (Agosto)"
    Modo_2_de_3 --> Modo_3_de_3: "+1 Estado de Cuenta (Julio o CSV propio)"
    Modo_1_de_3 --> Modo_3_de_3: "Botón 1-Click 'Activar Motor 3/3'"
```

---

### Diagrama 3: Flujo del Motor de Detección Trimestral (Lifestyle Creep, Inflación Silenciosa de Suscripciones y Simulador de Recorte)

```mermaid
flowchart TD
    TX["📋 Transacciones Sanitizadas de N Estados de Cuenta (GTQ / USD)"]

    TX --> CAT["Agrupación por 7 Categorías Canónicas"]
    TX --> REC["Filtro de Cargos Recurrentes y Visacuotas (MSI)"]
    TX --> ANT["Detector de Gastos Hormiga (Ticket <= Q95 / Alta Frecuencia)"]

    CAT --> CREEP_CHECK{"¿N >= 3 y M2 > 1.04*M1 y M3 > 1.04*M2?"}
    CREEP_CHECK -->|"Sí (+ Crecimiento 3M > 15%)"| CREEP_ALERT["🚨 Alerta de Lifestyle Creep (ej. Delivery +78% en 3 meses)"]
    CREEP_CHECK -->|"No"| CAT_NORMAL["📈 Gráfica de Distribución y Evolución por Categoría"]

    REC --> SUB_CHECK{"¿Precio Mes Actual - Precio Mes Base >= Q5?"}
    SUB_CHECK -->|"Sí"| SUB_ALERT["🔔 Alerta de Inflación Silenciosa (Netflix, iCloud+, Claro)"]
    SUB_CHECK -->|"No"| SUB_STABLE["✅ Suscripción Estable / Control de Cuota MSI"]

    CREEP_ALERT --> SIM["🎛️ Simulador Interactivo de Recorte Mensual y Anual"]
    SUB_ALERT --> SIM
    ANT --> SIM
    SIM --> PROJ["💰 Nuevo Estado de Cuenta Proyectado en Vivo (Q / $)"]
```

---

## 🛠️ Inicio Rápido y Documentación Detallada

```bash
npm install
npm run dev
# Abre http://localhost:3000
```

- 📘 **Guía paso a paso para probar los modos `1/3`, `2/3`, `3/3`, subir CSVs y usar el Simulador Bimoneda:** Lee [`docs/ONBOARDING.md`](./docs/ONBOARDING.md).
- 🛡️ **Detalle de expresiones regulares de anonimización PII, normalización de comercios y fórmulas de *Lifestyle Creep*:** Lee [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).
- 📋 **Especificación original de diseño progresivo:** Lee [`SPEC.md`](./SPEC.md).
