import test from "node:test";
import assert from "node:assert/strict";
import { reconcileStatement } from "../src/lib/statementAnalyzer.ts";

test("reconciles statement balances and estimates CrediFácil installments", () => {
  const diagnostics = reconcileStatement({
    id: "fixture", monthKey: "2026-10", monthLabel: "Octubre 2026", shortMonth: "Oct", cardAlias: "Banco G&T · Visa *4821", statementPeriod: "",
    bimonetaryMeta: { previousBalanceGtq: 1000, previousBalanceUsd: 20, purchasesGtq: 500, purchasesUsd: 10, extrafinanciamientoGtq: 100, extrafinanciamientoUsd: 0, paymentsGtq: 200, paymentsUsd: 5, closingBalanceGtq: 1400, closingBalanceUsd: 25, creditLimitGtq: 0, creditLimitUsd: 0 },
    transactions: [
      { id: "1", date: "2026-10-01", rawDescriptor: "CREDIFACIL CUOTA 04 DE 12", normalizedMerchant: "Distelsa", category: "Extrafinanciamiento y Cuotas", originalCurrency: "GTQ", originalAmount: 100, amountGTQ: 100, isExtrafinanciamiento: true, installmentInfo: { currentInstallment: 4, totalInstallments: 12 } },
      { id: "2", date: "2026-10-02", rawDescriptor: "SUPERMERCADO", normalizedMerchant: "Supermercado", category: "Supermercado y Despensa", originalCurrency: "GTQ", originalAmount: 500, amountGTQ: 500 },
    ],
  });
  assert.equal(diagnostics.currencies.GTQ.reconciles, true);
  assert.equal(diagnostics.currencies.GTQ.transactionsDifference, 0);
  assert.equal(diagnostics.installmentCount, 1);
  assert.equal(diagnostics.monthlyInstallmentGTQ, 100);
  assert.equal(diagnostics.estimatedRemainingGTQ, 800);
});

test("flags adjacent duplicate charges and financing fees", () => {
  const diagnostics = reconcileStatement({
    id: "fixture", monthKey: "2026-10", monthLabel: "Octubre 2026", shortMonth: "Oct", cardAlias: "G&T", statementPeriod: "",
    transactions: [
      { id: "1", date: "2026-10-02", rawDescriptor: "CAFE BARISTA", normalizedMerchant: "Café Barista", category: "Gastos Hormiga y Cafés", originalCurrency: "GTQ", originalAmount: 60, amountGTQ: 60 },
      { id: "2", date: "2026-10-03", rawDescriptor: "CAFE BARISTA GT", normalizedMerchant: "Café Barista", category: "Gastos Hormiga y Cafés", originalCurrency: "GTQ", originalAmount: 60, amountGTQ: 60 },
      { id: "3", date: "2026-10-05", rawDescriptor: "COMISION ADMINISTRATIVA", normalizedMerchant: "Comisión", category: "Compras y Cuotas (MSI)", originalCurrency: "GTQ", originalAmount: 15, amountGTQ: 15 },
    ],
  });
  assert.equal(diagnostics.duplicateCharges.length, 1);
  assert.deepEqual(diagnostics.feeLeakage, ["COMISION ADMINISTRATIVA"]);
});
