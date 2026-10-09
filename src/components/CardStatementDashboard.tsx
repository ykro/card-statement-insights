"use client";

import React, { useState, useMemo, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  CreditCard,
  Upload,
  Check,
  ArrowUpRight,
  RefreshCw,
  FileText,
} from "lucide-react";
import {
  CurrencyCode,
  CardStatement,
  analyzeStatements,
  formatCurrency,
  GTQ_PER_USD,
} from "@/lib/statementAnalyzer";
import { DEMO_STATEMENTS } from "@/lib/demoStatements";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

export default function CardStatementDashboard() {
  // Starts with 1 statement (Septiembre 2026) so the user immediately sees 1/3 working + subtle prompt for 3 months
  const [activeStatements, setActiveStatements] = useState<CardStatement[]>([
    DEMO_STATEMENTS[2],
  ]);
  const [currency, setCurrency] = useState<CurrencyCode>("GTQ");
  const [enabledSavingsIds, setEnabledSavingsIds] = useState<
    Record<string, boolean>
  >({
    "save-delivery": true,
    "save-ant": true,
    "save-subs": true,
    "save-mobility": false,
  });

  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const report = useMemo(
    () => analyzeStatements(activeStatements),
    [activeStatements]
  );

  const selectPresetCount = (count: 1 | 3) => {
    setUploadError(null);
    if (count === 1) {
      setActiveStatements([DEMO_STATEMENTS[2]]);
    } else {
      setActiveStatements([
        DEMO_STATEMENTS[0],
        DEMO_STATEMENTS[1],
        DEMO_STATEMENTS[2],
      ]);
    }
  };

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setIsUploading(true);
    setUploadError(null);

    try {
      const filesPayload: {
        name: string;
        mimeType: string;
        base64Data: string;
      }[] = [];

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const buffer = await file.arrayBuffer();
        filesPayload.push({
          name: file.name,
          mimeType: file.type || "application/pdf",
          base64Data: arrayBufferToBase64(buffer),
        });
      }

      const res = await fetch("/api/analyze-statements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: filesPayload,
          existingCount: activeStatements.length,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok || !Array.isArray(data.statements)) {
        throw new Error(
          data.error || "No se pudo interpretar el archivo subido."
        );
      }

      // If uploading 1 file while demo is active, replace or append cleanly
      const isCurrentlyDemo = activeStatements.every((s) =>
        s.id.startsWith("stmt-2026")
      );
      if (isCurrentlyDemo || data.statements.length >= 2) {
        setActiveStatements(data.statements);
      } else {
        setActiveStatements((prev) => [...prev, ...data.statements]);
      }
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : "Error al procesar el estado de cuenta."
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const fmt = (amountGTQ: number) => formatCurrency(amountGTQ, currency);
  const symbol = currency === "GTQ" ? "Q" : "$";
  const convert = (valGTQ: number) =>
    currency === "GTQ"
      ? Math.round(valGTQ)
      : Math.round(valGTQ / GTQ_PER_USD);

  const visibleSavingsPlan = report.savingsPlan.filter(
    (item) => item.unlockedAtStatements <= report.statementCount
  );

  const totalMonthlySavingsGTQ = visibleSavingsPlan.reduce(
    (sum, item) =>
      enabledSavingsIds[item.id] ? sum + item.monthlySavingsGTQ : sum,
    0
  );

  const projectedNextStatementGTQ = Math.max(
    0,
    report.kpis.currentMonthTotalGTQ - totalMonthlySavingsGTQ
  );

  const isThreeMonths = report.statementCount >= 3;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      {/* Hidden File Input for PDF / CSV */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.csv,.txt,application/pdf,text/csv"
        multiple
        onChange={(e) => handleFilesSelected(e.target.files)}
        className="hidden"
      />

      {/* Minimal Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <CreditCard className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-slate-900">
              Estados de Cuenta
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5 text-slate-500" />
              <span>Subir PDF</span>
            </button>

            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100/80 p-0.5">
              <button
                type="button"
                onClick={() => setCurrency("GTQ")}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                  currency === "GTQ"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                GTQ (Q)
              </button>
              <button
                type="button"
                onClick={() => setCurrency("USD")}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
                  currency === "USD"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-500 hover:text-slate-900"
                }`}
              >
                USD ($)
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-6">
        {/* Clean PDF Dropzone + Tiny Example Links */}
        <section
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFilesSelected(e.dataTransfer.files);
          }}
          className={`rounded-2xl border transition p-6 bg-white shadow-2xs ${
            isDragging
              ? "border-indigo-500 bg-indigo-50/30"
              : "border-slate-200/80"
          }`}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-base font-semibold text-slate-900">
                Sube tu estado de cuenta en PDF
              </h1>
              <p className="text-xs text-slate-500">
                Funciona desde 1 estado de cuenta. Sube al menos 3 meses para
                identificar tendencias de gasto.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition cursor-pointer"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Interpretando PDF...</span>
                  </>
                ) : (
                  <>
                    <FileText className="h-3.5 w-3.5" />
                    <span>Seleccionar PDF (1 a 3 meses)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {uploadError && (
            <p className="mt-3 text-xs text-rose-600">{uploadError}</p>
          )}

          {/* Tiny Subtle Example Switcher & Active Months */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span>Mostrando:</span>
              <span className="font-medium text-slate-700">
                {activeStatements.map((s) => s.monthLabel).join(" · ")}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span>Casos de ejemplo:</span>
              <button
                type="button"
                onClick={() => selectPresetCount(1)}
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition cursor-pointer ${
                  report.statementCount === 1
                    ? "bg-slate-200/80 text-slate-900"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                }`}
              >
                1 mes
              </button>
              <button
                type="button"
                onClick={() => selectPresetCount(3)}
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition cursor-pointer ${
                  report.statementCount >= 3
                    ? "bg-slate-200/80 text-slate-900"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                }`}
              >
                3 meses (con tendencias)
              </button>
            </div>
          </div>
        </section>

        {/* Progressive Prompt Banner when < 3 statements are loaded */}
        {!isThreeMonths && (
          <div className="flex flex-col gap-3 rounded-xl border border-indigo-200/80 bg-indigo-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-indigo-950">
              <span className="font-semibold">
                {report.statementCount} de 3 meses cargados:
              </span>{" "}
              Estás viendo el resumen mensual. Sube 3 estados de cuenta para
              identificar tendencias y aumentos en suscripciones.
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition cursor-pointer"
              >
                Agregar otro PDF
              </button>
              <button
                type="button"
                onClick={() => selectPresetCount(3)}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition cursor-pointer"
              >
                Ver ejemplo de 3 meses
              </button>
            </div>
          </div>
        )}

        {/* 4 Clean KPI Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
            <span className="text-xs font-medium text-slate-500">
              Gasto del último corte
            </span>
            <div className="mt-1.5 text-2xl font-bold tracking-tight tabular-nums text-slate-900">
              {fmt(report.kpis.currentMonthTotalGTQ)}
            </div>
            <p className="mt-1 text-xs text-slate-400 tabular-nums">
              {isThreeMonths
                ? `Promedio 3 meses: ${fmt(report.kpis.threeMonthAverageGTQ)}`
                : report.latestStatement.statementPeriod}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
            <span className="text-xs font-medium text-slate-500">
              Categoría principal
            </span>
            <div className="mt-1.5 text-lg font-bold tracking-tight text-slate-900 truncate">
              {report.kpis.topCategory.name}
            </div>
            <p className="mt-1 text-xs text-slate-500 tabular-nums">
              {fmt(report.kpis.topCategory.amountGTQ)} (
              {report.kpis.topCategory.sharePct.toFixed(0)}% del total)
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
            <span className="text-xs font-medium text-slate-500">
              Suscripciones y cuotas
            </span>
            <div className="mt-1.5 text-2xl font-bold tracking-tight tabular-nums text-slate-900">
              {fmt(report.kpis.recurringAndInstallmentsGTQ)}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {report.kpis.recurringCount} cargos recurrentes detectados
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
            <span className="text-xs font-medium text-slate-500">
              Gastos hormiga del mes
            </span>
            <div className="mt-1.5 text-2xl font-bold tracking-tight tabular-nums text-slate-900">
              {fmt(report.kpis.antExpensesCurrentMonthGTQ)}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {report.kpis.antExpensesVisitCount} compras pequeñas frecuentes
            </p>
          </div>
        </section>

        {/* Main Content Grid: Chart + Savings Plan */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left 7 cols: Category Breakdown or 3-Month Trend Chart */}
          <div className="lg:col-span-7 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs flex flex-col justify-between space-y-5">
            <div className="flex items-baseline justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {isThreeMonths
                    ? "Tendencia de gastos (3 meses)"
                    : "Gasto por categoría"}
                </h2>
                <p className="text-xs text-slate-500">
                  {isThreeMonths
                    ? "Comparativa mensual para identificar qué rubros están subiendo"
                    : "Distribución de tu estado de cuenta actual"}
                </p>
              </div>
            </div>

            <div className="h-[280px] w-full">
              {isThreeMonths ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={report.categories.map((cat) => ({
                      category: cat.category.split(" ")[0],
                      fullCategory: cat.category,
                      m1: convert(cat.monthlySeries[0]?.amountGTQ ?? 0),
                      m2: convert(cat.monthlySeries[1]?.amountGTQ ?? 0),
                      m3: convert(cat.monthlySeries[2]?.amountGTQ ?? 0),
                      label1:
                        cat.monthlySeries[0]?.shortMonth || "Mes 1",
                      label2:
                        cat.monthlySeries[1]?.shortMonth || "Mes 2",
                      label3:
                        cat.monthlySeries[2]?.shortMonth || "Mes 3",
                    }))}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e2e8f0"
                    />
                    <XAxis
                      dataKey="category"
                      axisLine={{ stroke: "#e2e8f0" }}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      tickFormatter={(v: number) =>
                        `${symbol}${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`
                      }
                    />
                    <Tooltip
                      formatter={(val: number) => [
                        `${symbol}${val.toLocaleString("es-GT")}`,
                        "",
                      ]}
                      contentStyle={{
                        borderRadius: "12px",
                        borderColor: "#e2e8f0",
                        fontSize: "12px",
                      }}
                    />
                    <Bar
                      dataKey="m1"
                      name={activeStatements[0]?.shortMonth || "Mes 1"}
                      fill="#cbd5e1"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="m2"
                      name={activeStatements[1]?.shortMonth || "Mes 2"}
                      fill="#818cf8"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="m3"
                      name={activeStatements[2]?.shortMonth || "Mes 3"}
                      fill="#4f46e5"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={report.categories.map((cat) => ({
                      name: cat.category,
                      amount: convert(cat.currentMonthGTQ),
                      color: cat.color,
                    }))}
                    margin={{ top: 4, right: 16, left: 10, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="#e2e8f0"
                    />
                    <XAxis
                      type="number"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#64748b", fontSize: 12 }}
                      tickFormatter={(v: number) =>
                        `${symbol}${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`
                      }
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={150}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#334155", fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(val: number) => [
                        `${symbol}${val.toLocaleString("es-GT")}`,
                        "Gasto",
                      ]}
                      contentStyle={{
                        borderRadius: "12px",
                        borderColor: "#e2e8f0",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="amount" radius={[0, 6, 6, 0]}>
                      {report.categories.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Detected 3-Month Trends List (Only when 3+ months) */}
            {isThreeMonths && report.lifestyleCreepAlerts.length > 0 && (
              <div className="border-t border-slate-100 pt-4 space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Tendencias detectadas en 3 meses
                </span>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {report.lifestyleCreepAlerts.slice(0, 2).map((alert) => (
                    <div
                      key={alert.id}
                      className="rounded-xl border border-rose-200/70 bg-rose-50/40 p-3 text-xs"
                    >
                      <div className="flex items-center justify-between font-semibold text-rose-900">
                        <span>{alert.category}</span>
                        <span className="inline-flex items-center text-rose-600 tabular-nums">
                          +{alert.growthPct3M.toFixed(0)}%
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                      <p className="mt-1 text-slate-600 tabular-nums">
                        Subió de {fmt(alert.month1GTQ)} a {fmt(alert.month3GTQ)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right 5 cols: Sugerencias para gastar menos */}
          <div className="lg:col-span-5 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs flex flex-col justify-between space-y-5">
            <div>
              <div className="flex items-baseline justify-between">
                <h2 className="text-base font-semibold text-slate-900">
                  Sugerencias para gastar menos
                </h2>
                <span className="text-xs font-semibold text-emerald-700 tabular-nums">
                  Ahorro: {fmt(totalMonthlySavingsGTQ)}/mes
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                Activa o desactiva acciones para proyectar tu próximo corte
              </p>

              <div className="mt-4 space-y-2.5">
                {visibleSavingsPlan.map((item) => {
                  const checked = Boolean(enabledSavingsIds[item.id]);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setEnabledSavingsIds((prev) => ({
                          ...prev,
                          [item.id]: !prev[item.id],
                        }))
                      }
                      className={`w-full rounded-xl border p-3.5 text-left transition cursor-pointer ${
                        checked
                          ? "border-emerald-300 bg-emerald-50/40"
                          : "border-slate-200/80 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <span
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                              checked
                                ? "border-emerald-600 bg-emerald-600 text-white"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {checked && <Check className="h-3 w-3" />}
                          </span>
                          <div>
                            <div className="text-xs font-semibold text-slate-900">
                              {item.title}
                            </div>
                            <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">
                              {item.description}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 text-xs font-semibold tabular-nums text-emerald-700">
                          -{fmt(item.monthlySavingsGTQ)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Projected Next Statement Footer */}
            <div className="rounded-xl border border-slate-200/80 bg-[#F8FAFC] p-4 flex items-center justify-between">
              <div>
                <span className="block text-xs text-slate-500">
                  Próximo estado de cuenta estimado
                </span>
                <span className="text-xs text-emerald-700 font-medium tabular-nums">
                  Ahorro anual: {fmt(totalMonthlySavingsGTQ * 12)}
                </span>
              </div>
              <div className="text-xl font-bold tabular-nums text-slate-900">
                {fmt(projectedNextStatementGTQ)}
              </div>
            </div>
          </div>
        </section>

        {/* Compact Top Merchants Table */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs">
          <h2 className="text-base font-semibold text-slate-900 mb-4">
            Comercios principales
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-medium">
                  <th className="pb-2.5">Comercio</th>
                  <th className="pb-2.5">Categoría</th>
                  <th className="pb-2.5 text-right">Cargos</th>
                  <th className="pb-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.topMerchants.slice(0, 6).map((m) => (
                  <tr key={m.merchant} className="text-slate-700">
                    <td className="py-2.5 font-medium text-slate-900">
                      {m.merchant}
                    </td>
                    <td className="py-2.5 text-slate-500">{m.category}</td>
                    <td className="py-2.5 text-right tabular-nums text-slate-500">
                      {isThreeMonths
                        ? m.visitCountTotal
                        : m.visitCountCurrentMonth}
                    </td>
                    <td className="py-2.5 text-right font-semibold tabular-nums text-slate-900">
                      {fmt(
                        isThreeMonths
                          ? m.totalAcrossMonthsGTQ
                          : m.currentMonthGTQ
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
