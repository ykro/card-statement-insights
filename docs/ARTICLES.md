# Temas para Artículos Técnicos y de Producto: Card Statement Insights (`card-statement-insights`)

Selección de 6 temas (3 de producto/finanzas personales y 3 de ingeniería de software) derivados del desarrollo de **Card Statement Insights**.

---

## Producto y Finanzas Personales

### 1. Extracción determinista en milisegundos de estados de cuenta bancarios en PDF frente a la latencia de OCR y LLMs multimodales
Cómo descomprimir flujos `FlateDecode` (`zlib.inflateSync`) e interpretar operadores posicionales de texto en PDF (`BT...ET`, `Tj`, `TJ`) para extraer cerca de 100 transacciones bimonetarias en ~6 ms, evitando timeouts por imágenes incrustadas en estados de cuenta reales.

### 2. De estados de cuenta aislados a inteligencia de tendencias multi-mes
Cómo el análisis progresivo de 1 a 3 o más cortes mensuales permite detectar aceleración de gasto por categoría, cobros hormiga o suscripciones fragmentadas y separar el impacto real del extrafinanciamiento/cuotas frente a las compras regulares del mes.

### 3. Diseño de tableros financieros orientados a la decisión y no solo al resumen contable
Cómo transformar tablas de transacciones bancarias en escenarios accionables (`Actual` vs. `Meta`) que cuantifican el impacto directo de cada ajuste sobre el pago del próximo estado de cuenta en Quetzales y Dólares.

---

## Ingeniería de Software

### 4. Anatomía de un parser PDF bancario en Node.js sin dependencias nativas (`zlib.inflateSync` y decodificación de bloques `BT...ET`)
Cómo localizar streams comprimidos en el binario PDF, reconstruir líneas mediante coordenadas tipográficas (`Td`, `TD`, `Tm`) y decodificar secuencias octales/hexadecimales en `6.38 ms`.

### 5. Máquina de estados léxica para particionar estados de cuenta bimonetarios y tablas de extrafinanciamiento
Cómo diferenciar programáticamente las secciones de consumos regulares del titular (`GTQ` y `USD`), tarjetas adicionales y cuotas de extrafinanciamiento para evitar que el saldo financiado a plazos distorsione el gasto corriente del mes.

### 6. Fusión incremental de múltiples PDFs en el cliente (`DataTransfer` / `FileList`) y cálculo de matrices de velocidad de gasto (`spendVelocity`)
Arquitectura en React para acumular nuevos estados de cuenta arrastrados desde cualquier vista, ordenar cronológicamente los cortes, deduplicar períodos y proyectar la tendencia a 90 días.
