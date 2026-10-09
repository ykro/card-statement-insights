# Guía de Onboarding: Card Statement Insights

Bienvenido a la guía oficial de **Card Statement Insights** (`card-statement-insights`), el analizador ejecutivo de estados de cuenta de tarjetas de crédito bimonetarios (`GTQ Q` y `USD $`) que separa la pantalla de carga de la pantalla de análisis, extrae estados de cuenta PDF reales en menos de 50 ms y desbloquea detección de tendencias al cargar 3 o más meses.

- **Producción en Vivo (Vercel):** [https://card-statement-insights.vercel.app](https://card-statement-insights.vercel.app)
- **Especificación Funcional:** [`SPEC.md`](../SPEC.md)
- **Arquitectura Privacy-First y Motor de Tendencias:** [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md)
- **Índice General de Prototipos:** [`ykro/ilab-aibuilders-prototypes`](https://github.com/ykro/ilab-aibuilders-prototypes)

---

## 1. Configuración de Desarrollo Local (Local Setup)

### Requisitos Previos
- **Node.js** `>= 20.x`
- **npm** `>= 10.x`
- Clave de API de Google Gemini (`GEMINI_API_KEY`) opcional — el sistema cuenta con un **extractor nativo de flujos PDF (`zlib.inflateSync`) y motor analítico determinista** que procesa estados de cuenta PDF bimonetarios en `< 10 ms` sin depender de llamadas externas.

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

## 2. Flujo de Uso en Dos Pantallas

### Pantalla 1: Ingesta de Estados de Cuenta (`screen === "upload"`)
Al abrir la aplicación verás una pantalla minimalista dedicada exclusivamente a la carga de archivos:
1. **Subir de 1 a 3+ PDFs propios:** Arrastra tu estado de cuenta en PDF (ej. Banco Industrial MasterCard / Visa, BAC) o selecciónalo desde tu equipo.
2. **Botones de Exploración Rápida (sin archivo PDF a la mano):**
   - **"Cargar ejemplo real Bimonetario (1 mes: Q + $ + Extraf)"**: Carga las 101 transacciones reales anonimizadas del corte de Septiembre 2026 (`Q11,344.19` en Quetzales, `$2,910.73` en Dólares y `Q36,638.02` en Extrafinanciamientos).
   - **"Cargar tendencia de 3 meses (Jul – Sep 2026)"**: Carga la serie trimestral completa para explorar el motor de tendencias.

### Pantalla 2: Dashboard Ejecutivo (`screen === "dashboard"`)
Una vez procesado el PDF, la aplicación transiciona al dashboard ejecutivo:
1. **Radiografía Bimonetaria Simultánea:** Visualiza lado a lado tus compras regulares en Quetzales (`Q`), tus compras en Dólares (`$`), el total consolidado y tus cuotas de Extrafinanciamiento (`FIN/CT` capital y `FIN/IN` intereses).
2. **Panel "Información para Decidir":** Activa o desactiva las 4 decisiones financieras cuantificadas para proyectar de inmediato cuánto bajará tu próximo estado de cuenta tanto en Quetzales como en Dólares.
3. **Gráficos de Velocidad Semanal, Evolución de 3 Meses y Concentración de Comercios:** Identifica qué semanas del mes o qué categorías están acelerando tu gasto y cuáles son los 5 comercios que concentran más del 65% de tu consumo.
4. **Regreso o Adición de Meses:** Usa el botón superior **"Subir o agregar estados de cuenta"** o **"Agregar otro PDF"** en cualquier momento.
