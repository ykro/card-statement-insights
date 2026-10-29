import test from "node:test";
import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";
import { detectStatementIssuer, redactPiiFromText, parseGytContinentalTokens, parsePdfStatementBuffer } from "../src/lib/pdf-statement-parser.ts";

test("detects Banco G&T and Banco Industrial from their statement signatures", () => {
  assert.equal(detectStatementIssuer([{ text: "G&T CONTINENTAL", dx: 0, dy: 0 }]), "Banco G&T Continental");
  assert.equal(detectStatementIssuer([{ text: "BANCO INDUSTRIAL", dx: 0, dy: 0 }]), "Banco Industrial");
  assert.equal(detectStatementIssuer([], "gtc-estado.pdf"), "Banco G&T Continental");
});

test("dispatches a compressed synthetic G&T PDF stream to the bank parser", () => {
  const stream = Buffer.from(["BT", "(G&T CONTINENTAL) Tj", "(MOVIMIENTOS EN QUETZALES) Tj", "(01/10/2026) Tj", "(COMPRA LOCAL) Tj", "(Q 45.00) Tj", "ET"].join("\n"), "latin1");
  const pdf = Buffer.concat([Buffer.from("%PDF-1.4\nstream\n", "latin1"), deflateSync(stream), Buffer.from("\nendstream", "latin1")]);
  const parsed = parsePdfStatementBuffer(pdf, "gtc-octubre.pdf");
  assert.equal(parsed.bankName, "Banco G&T Continental");
  assert.equal(parsed.regularTransactionsGtq[0]?.rawDescriptor, "COMPRA LOCAL");
  assert.equal(parsed.regularTransactionsGtq[0]?.amount, 45);
});

test("redacts names, identity numbers, email, address, and full card numbers", () => {
  const result = redactPiiFromText("TITULAR: ANA PEREZ NIT: 1234567-8 DPI: 1234567890101 ana@example.com CALZADA ROOSEVELT 12-34 ZONA 7 tarjeta 1234567890123456");
  for (const secret of ["ANA PEREZ", "1234567-8", "1234567890101", "ana@example.com", "CALZADA ROOSEVELT", "1234567890123456"]) {
    assert.equal(result.includes(secret), false, `leaked ${secret}`);
  }
  assert.match(result, /\*{4}-\*{4}-\*{4}-3456/);
});

test("parses G&T dual currency summary and transaction rows", () => {
  const tokens = [
    "G&T CONTINENTAL", "VISA", "XXXX-XXXX-XXXX-4821", "Fecha de Corte", "17/10/2026", "Fecha Limite de Pago", "11/11/2026",
    "Saldo Anterior GTQ 1000.00 USD 20.00", "Compras y Débitos GTQ 500.00 USD 10.00", "Extrafinanciamiento GTQ 100.00 USD 0.00", "Pagos y Créditos GTQ 200.00 USD 5.00", "Saldo al Corte GTQ 1400.00 USD 25.00", "Pago Mínimo GTQ 50.00 USD 5.00",
    "MOVIMIENTOS EN QUETZALES", "01/10/2026", "CREDIFACIL MAX DISTELSA CUOTA 04 DE 12", "Q 100.00", "02/10/2026", "SUPER MERCADO", "Q 500.00", "PAGOS Y CREDITOS", "03/10/2026", "PAGO EN LINEA GTC", "200.00-",
    "MOVIMIENTOS EN DOLARES", "04/10/2026", "NETFLIX", "US$ 10.00", "05/10/2026", "PAGO TC G&T", "5.00 CR",
  ].map((text) => ({ text, dx: 0, dy: 0 }));
  const parsed = parseGytContinentalTokens(tokens);
  assert.equal(parsed.bankName, "Banco G&T Continental");
  assert.equal(parsed.cardMask, "4821");
  assert.equal(parsed.monthKey, "2026-10");
  assert.equal(parsed.summary.purchasesGtq, 500);
  assert.equal(parsed.summary.purchasesUsd, 10);
  assert.equal(parsed.summary.minimumPaymentGtq, 50);
  assert.equal(parsed.summary.minimumPaymentUsd, 5);
  assert.equal(parsed.extrafinanciamientoTransactions[0]?.amount, 100);
  assert.equal(parsed.extrafinanciamientoTransactions[0]?.installmentCode, "04/12");
  assert.equal(parsed.paymentTransactions.length, 2);
  assert.equal(parsed.regularTransactionsUsd[0]?.rawDescriptor, "NETFLIX");
});
