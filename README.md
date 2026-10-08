# 💳 Card Statement Insights (`card-statement-insights`)

Dashboard inteligente a partir de estados de cuenta de tarjeta de crédito: **funciona desde 1 solo estado de cuenta** para análisis inmediato, y **desbloquea el Motor de Tendencias Trimestrales al subir 3 o más estados de cuenta** para identificar hábitos en crecimiento y sugerir recortes concretos.

> 📌 **Documento de Especificación (Alcance, Modos 1-Mes vs 3-Meses y Plan de 1 Semana):** [Ver SPEC.md](./SPEC.md)
> 🔗 **Índice General de Proyectos:** [`ykro/hackathon-prototipos-index`](https://github.com/ykro/hackathon-prototipos-index)
> 🧪 **Benchmark Gemini 4 Argon & A/B Tests:** [`ykro/gemini-argon-agy-benchmark`](https://github.com/ykro/gemini-argon-agy-benchmark)

## 🎯 El Problema
Los estados de cuenta bancarios son difíciles de leer y están diseñados para que solo veas el pago mínimo o el total. Con 1 estado de cuenta no sabes dónde se te fue el dinero ese mes; y sin comparar al menos 3 meses, es imposible notar qué categorías están creciendo silenciosamente (*lifestyle creep*) o qué suscripciones subieron de precio.

## 💡 La Solución (Diseño Progresivo: Funciona con 1, Brilla con 3+)
Un dashboard *Privacy-First* fácil de consumir que se adapta a cuántos estados de cuenta suba el usuario:
1. **Con 1 Estado de Cuenta (Modo Radiografía Mensual):**
   - Funciona al instante: desglosa gasto por categoría, top comercios, suscripciones detectadas, compras a Meses Sin Intereses (MSI) y gastos hormiga del mes, más sugerencias de ahorro inmediato.
   - Muestra un **Banner Progresivo Inteligente:** *"📊 Estás viendo tu radiografía de 1 mes (1/3). Sube 2 estados de cuenta más para desbloquear la Detección de Tendencias Trimestrales y aumentos silenciosos de precios"*.
2. **Con 3+ Estados de Cuenta (Modo Tendencias Completo - Recomendado):**
   - Activa las gráficas comparativas **Mes 1 → Mes 2 → Mes 3**, detecta categorías en aceleración, frecuencia acumulada de gastos hormiga, aumentos en suscripciones y un **Simulador Interactivo de Recorte** para el próximo mes.

## 🛠️ Stack & Despliegue
- **Frontend:** Next.js + Tailwind CSS + Recharts (Dashboard limpio de consumo rápido)
- **IA Cloud:** API de **Gemini (`gemini-3.8-flash`)** para extracción multimodal de PDFs/CSVs y generación de recomendaciones cuantificadas
- **IA Local / Privacidad:** **Gemma 4 E2B** para anonimización/redacción local de datos sensibles (RFC, número de tarjeta, dirección) y normalización rápida de nombres de comercios
- **Deploy:** **Vercel** o **Google Cloud Run** (`pm-innovationlab`)
