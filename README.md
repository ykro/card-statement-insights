# 💳 Card Statement Insights (`card-statement-insights`)

Dashboard inteligente a partir de estados de cuenta de tarjeta de crédito: procesa **3 meses de estados de cuenta (PDF o CSV)**, identifica tendencias (*trends*) de gasto ocultas y genera sugerencias accionables con monto exacto de ahorro mensual.

> 📌 **Documento de Especificación (Alcance, Arquitectura y Plan de 1 Semana):** [Ver SPEC.md](./SPEC.md)

## 🎯 El Problema
La mayoría de las personas recibe su estado de cuenta en PDF cada mes, mira únicamente el "Pago para no generar intereses" y lo cierra. No notan cómo ciertas categorías crecen silenciosamente mes a mes (*lifestyle creep*), suscripciones olvidadas que subieron de precio, ni el impacto acumulado de los gastos hormiga en un trimestre.

## 💡 La Solución (MVP de 1 Semana)
Una aplicación web *Privacy-First* donde el usuario arrastra **3 estados de cuenta (Mes 1, Mes 2, Mes 3)** en PDF o CSV y obtiene en segundos:
1. **Extracción y Categorización Automática con IA:** Sin importar el formato del banco, extrae fecha, comercio, monto y asigna categoría inteligente.
2. **Detección de Tendencias de 3 Meses (3-Month Trend Engine):** Identifica qué categorías están acelerando (ej. *"Tu gasto en Delivery subió +42% entre el Mes 1 y el Mes 3"*), suscripciones recurrentes y cargos duplicados o inusuales.
3. **Plan de Ahorro Personalizado:** Genera de 3 a 5 sugerencias ultra-específicas basadas en sus propios comercios frecuentes con una meta clara: *"Cómo reducir tu próximo estado de cuenta en $X al mes"*.

## 🛠️ Stack Sugerido para Hackathon
- **Frontend:** Next.js + Tailwind CSS + Recharts / Tremor (Dashboard analítico moderno)
- **Ingesta PDF + IA:** PyMuPDF / `pdf-parse` + Gemini 2.5 Flash (soporta lectura directa de PDFs y tablas complejas con *Structured Outputs*)

## 🚀 Cómo empezar
Revisa el detalle completo del pipeline de extracción de PDFs, las métricas de tendencias de 3 meses y el plan día por día en **[SPEC.md](./SPEC.md)**.
