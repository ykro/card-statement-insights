# Agent guide

## Commands

- `npm run dev`: start the local Next.js app.
- `npm run build`: compile the production app.
- `npm test`: run deterministic Node.js tests for issuer detection, G&T parsing, PII redaction, and reconciliation.

## Architecture

- `src/lib/pdf-statement-parser.ts` extracts PDF text tokens, detects the issuer, dispatches to bank parsing, and removes PII locally.
- `src/lib/statementAnalyzer.ts` converts parsed rows into dashboard statements and calculates spend, trends, and reconciliation/installment diagnostics.
- `src/lib/demoStatements.ts` contains the existing demo plus Banco G&T Continental demo series.
- `src/components/CardStatementDashboard.tsx` renders the upload flow, demo selector, and analysis dashboard.
- `src/app/api/analyze-statements/route.ts` handles uploads and only forwards locally redacted text to optional AI enrichment.

## Privacy invariants

- Strip names, cardholder identifiers, NIT/DPI, email addresses, street addresses, and full card numbers before creating raw text samples, AI prompts, or fallback parser input.
- Never add raw statement contents to logs or diagnostics. Keep the last four card digits only.

## Adding a bank parser

1. Add an issuer signature to `detectStatementIssuer` and a parser accepting `PdfTextToken[]`.
2. Return the shared `ExtractedPdfStatementData` shape so `convertExtractedPdfToCardStatement` remains bank agnostic.
3. Redact PII from descriptors and text before returning data.
4. Add deterministic fixtures and tests for metadata, both currencies, transactions, payments, and installment rows.
5. Run `npm test` and `npm run build`.
