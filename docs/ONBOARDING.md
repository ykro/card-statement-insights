# 🚀 Guía de Onboarding: Card Statement Insights

Bienvenido a la guía oficial de **Card Statement Insights** (`card-statement-insights`), el analizador progresivo de estados de cuenta de tarjetas de crédito con arquitectura **Privacy-First** que entrega valor inmediato desde **1 estado de cuenta (1/3)** y desbloquea el **Motor de Tendencias Trimestrales al cargar 3 o más estados de cuenta (3/3)**.

- 🌐 **Producción en Vivo (Vercel):** [https://card-statement-insights.vercel.app](https://card-statement-insights.vercel.app)
- 📋 **Especificación Funcional:** [`SPEC.md`](../SPEC.md)
- 🛡️ **Arquitectura Privacy-First y Motor de Tendencias:** [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md)

---

## 1. Configuración de Desarrollo Local (Local Setup)

### Requisitos Previos
- **Node.js** `>= 20.x`
- **npm** `>= 10.x`
- Clave de API de Google Gemini (`GEMINI_API_KEY`) opcional — el sistema incluye **auditoría PII local y motor analítico determinista integrado** para funcionar sin fricción incluso sin conexión al API externo.

### Instalación Paso a Paso

```bash
# 1. Clonar el repositorio e ingresar al directorio
git clone https://github.com/ykro/card-statement-insights.git
cd card-statement-insights

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno locales
cp .env.example .env.local
```

### Configuración de `.env.local`
Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```env
# Clave de Google AI Studio / Vertex AI para insights ejecutivos y extracción
GEMINI_API_KEY="tu_api_key_aqui"

# Modelos configurados en /api/analyze-statements
NEXT_PUBLIC_INSIGHTS_MODEL="gemini-3.8-flash"
NEXT_PUBLIC_PRIVACY_MODEL="gemma-4-e2b"
```

### Comandos de Ejecución y Verificación

```bash
# Levantar servidor de desarrollo en http://localhost:3000
npm run dev

# Compilar versión de producción y validar TypeScript
npm run build

# Ejecutar linter
npm run lint
```

---

## 2. Cómo Probar la Experiencia Progresiva (`1/3`, `2/3` y `3/3` Estados de Cuenta)

El núcleo de la experiencia de usuario es que **nunca bloquea al usuario si solo tiene un estado de cuenta a la mano**, pero le muestra claramente qué desbloquea al agregar su historial trimestral:

### Paso 1: Modo `1/3` — Radiografía Mensual (`snapshot-1m`)
- Haz clic en el botón superior **"1/3 · Radiografía 1 Mes (Sep 2026)"**.
- **Qué observar:**
  - Los 4 KPIs superiores muestran el gasto del último corte, la categoría principal, el drenaje en suscripciones/Visacuotas y los **Gastos Hormiga** del mes (`Café Barista`, `Super 24 Conveniencia`, viajes cortos).
  - La gráfica central presenta el desglose del mes y el Top de comercios normalizados.
  - Aparece el **Banner Progresivo Ámbar/Azul** invitando a cargar 2 estados más para activar el Radar de Tendencias Trimestrales.

### Paso 2: Modo `2/3` — Comparativo Mes vs. Mes (`comparative-2m`)
- Haz clic en **"2/3 · Comparativo 2 Meses (Ago–Sep)"**.
- **Qué observar:**
  - Se habilitan los indicadores de variación porcentual mensual ($\Delta\%$ Mes 1 vs. Mes 2) en cada categoría y en el KPI principal.
  - El Simulador de Ahorro desbloquea la tarjeta adicional de **Optimización de Movilidad y Combustible**.
  - El banner progresivo indica que estás a **1 solo estado de cuenta** de confirmar tendencias estructurales de 3 meses.

### Paso 3: Modo `3/3` — Motor Completo de Tendencias Trimestrales (`trends-3m`)
- Haz clic en **"3/3 · Motor de Tendencias 3M (Jul–Ago–Sep)"**.
- **Qué observar:**
  - El badge cambia a verde: **✅ Análisis de Tendencias Trimestrales Activo (3/3 meses)**.
  - Se desbloquea la **Gráfica de Evolución Trimestral (`Julio → Agosto → Septiembre`)** por categoría.
  - Se activa el panel de **Alertas de *Lifestyle Creep*** (categorías que crecieron durante 2 cortes consecutivos, como *Delivery y Restaurantes* $+78\%$).
  - Se activa el **Detector de Inflación Silenciosa en Suscripciones**, marcando en rojo los servicios recurrentes que subieron de tarifa respecto al mes base (`Netflix`, `Apple.com/bill iCloud+`, `Claro Guatemala`).

---

## 3. Subida de Archivos Propios (CSV / TXT de Estados de Cuenta)

Además de los datasets pre-cargados de Guatemala (`PedidosYa`, `Supermercados La Torre`, `Paiz`, `Café Barista`, `Gasolinera Uno`, `Claro`, `Almacenes Siman Visacuotas`), puedes subir tus propios archivos:

1. Ubica el panel **"Subir Estado de Cuenta (CSV / TXT)"** en la parte superior del dashboard.
2. Sube un archivo `.csv` o `.txt` con líneas en formato `fecha, descripción_comercio, monto` (por ejemplo: `2026-10-04, POS*PEDIDOSYA ZONA 10, 215.00`).
3. **Flujo Automático al Subir:**
   - El módulo local `redactPiiAndNormalizeText` anonimiza números de tarjeta (`4532-xxxx`), NIT, DPI, nombre del titular y dirección **antes** de cualquier análisis externo.
   - `normalizeDirtyMerchantName` limpia descriptores bancarios crípticos (`VISANET*SUPERMERCADOS LA TORRE` → `Supermercados La Torre`).
   - El contador progresivo avanza automáticamente (`1/3` → `2/3` → `3/3`).

---

## 4. Uso del Simulador Interactivo de Recorte en `GTQ (Q)` y `USD ($)`

### Conmutador Bimoneda (`GTQ Q` ↔ `USD $`)
En el encabezado puedes alternar en cualquier momento entre **Quetzales (`GTQ Q`)** y **Dólares (`USD $`)** (tasa de conversión `Q7.75 = $1.00 USD`). Todas las gráficas, alertas de inflación, tablas de comercios y metas de ahorro se recalculan instantáneamente.

### Simulador "¿Cuánto Puedes Ahorrar el Próximo Mes?"
En la sección inferior del dashboard encontrarás tarjetas interactivas con interruptores (*toggle switches*):
- **Revertir Lifestyle Creep en Delivery y Restaurantes (-40%)**
- **Tope semanal a Gastos Hormiga (Café Barista y Super 24)**
- **Ajustar suscripciones con Inflación Silenciosa (Netflix / iCloud / Claro)**
- **Consolidar recargas de combustible y viajes cortos en Uber**

Al activar o desactivar cada interruptor, el panel derecho recalcula en vivo:
1. **Ahorro Mensual Estimado** y **Ahorro Anualizado (12 meses)**.
2. **Nuevo Estado de Cuenta Proyectado** para tu próximo corte comparado contra tu gasto actual.

---

## 5. Despliegue Continuo en Vercel (Auto-Deploy)

El proyecto cuenta con integración continua en **Vercel**:
- **URL Productiva:** `https://card-statement-insights.vercel.app`
- **Ramas Activas:**
  - `main`: Rama principal de producción.
  - `benchmark/argon-v1`: Rama de referencia para el benchmark [`ykro/gemini-argon-agy-benchmark`](https://github.com/ykro/gemini-argon-agy-benchmark).
