# Card Statement Insights (`card-statement-insights`)

Analizador visual de estados de cuenta de tarjetas de crédito bimonetarios (`GTQ Q` y `USD $`) en PDF. Permite arrastrar uno o varios estados de cuenta para visualizar el gasto por categoría, comparar tendencias multi-mes, simular decisiones de ahorro y filtrar movimientos.

- **Demo en Vivo:** [https://card-statement-insights.vercel.app](https://card-statement-insights.vercel.app)
- **Índice de Prototipos:** [`ykro/ilab-aibuilders-prototypes`](https://github.com/ykro/ilab-aibuilders-prototypes)

---

## Estructura de la Aplicación

1. **Pantalla de Carga (Drag & Drop Multi-PDF):** Zona para arrastrar y soltar uno o varios archivos `.pdf` simultáneamente, o cargar ejemplos de 1 mes y 3 meses.
2. **Dashboard en 4 Vistas Gráficas:**
   - **Resumen y Gráficas:** Indicadores principales (`Compras Q`, `Compras $`, `Cuotas / Extrafinanciamiento Q`) y gráficas de gasto por categoría (`Q` vs `$`), compras regulares vs. extrafinanciamiento y top 8 comercios.
   - **Tendencias (1 a 3+ Meses):** Barra superior para arrastrar más PDFs en vivo, evolución multi-mes con proyección a 90 días y barras de velocidad de crecimiento por categoría.
   - **Decisiones:** Gráfica comparativa del próximo estado de cuenta (`Corte actual` vs. `Nuevo corte meta`) y 4 tarjetas de decisión interactivas.
   - **Movimientos:** Tabla con búsqueda y filtros por moneda (`Todos`, `Quetzales Q`, `Dólares $`, `Cuotas`) y por mes.

---

## Documentación y Artículos

- **Arquitectura Técnica y Diagramas:** [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md)
- **Temas para Artículos Técnicos y de Producto (6 temas):** [`docs/ARTICLES.md`](./docs/ARTICLES.md)
- **Especificación Funcional:** [`SPEC.md`](./SPEC.md)
- **Guía de Uso:** [`docs/ONBOARDING.md`](./docs/ONBOARDING.md)

---

## Ejecución Local

```bash
npm install
npm run dev
```
