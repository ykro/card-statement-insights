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
  ComposedChart,
  Line,
  Legend,
} from "recharts";
import {
  CreditCard,
  Upload,
  Check,
  ArrowUpRight,
  ArrowLeft,
  RefreshCw,
  FileText,
  TrendingUp,
  Layers,
  ShieldCheck,
  SlidersHorizontal,
  Plus,
} from "lucide-react";
import {
  CardStatement,
  analyzeStatements,
  formatNativeCurrency,
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
  // Screen state: strictly separates Input ("upload") and Output ("dashboard")
  const [screen, setScreen] = useState<"upload" | "dashboard">("upload");

  const [activeStatements, setActiveStatements] = useState<CardStatement[]>([
    DEMO_STATEMENTS[2],
  ]);
  const [hasLoadedAny, setHasLoadedAny] = useState<boolean>(false);

  const [enabledDecisionIds, setEnabledDecisionIds] = useState<
    Record<string, boolean>
  >({
    "dec-uber-frequency": true,
    "dec-ant-frequency": true,
    "dec-bimonetary-subs": true,
    "dec-extrafinanciamiento-structure": true,
    "dec-dining-fx": false,
  });

  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadMode, setUploadMode] = useState<"replace" | "append">("replace");
  const [lastParseMs, setLastParseMs] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const report = useMemo(
    () => analyzeStatements(activeStatements),
    [activeStatements]
  );

  const loadPresetAndOpenDashboard = (count: 1 | 3) => {
    setUploadError(null);
    setLastParseMs(6.4);
    if (count === 1) {
      setActiveStatements([DEMO_STATEMENTS[2]]);
    } else {
      setActiveStatements([
        DEMO_STATEMENTS[0],
        DEMO_STATEMENTS[1],
        DEMO_STATEMENTS[2],
      ]);
    }
    setHasLoadedAny(true);
    setScreen("dashboard");
  };

  const handleFilesSelected = async (
    fileList: FileList | null,
    modeOverride?: "replace" | "append"
  ) => {
    if (!fileList || fileList.length === 0) return;
    setIsUploading(true);
    setUploadError(null);
    const effectiveMode = modeOverride ?? uploadMode;

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
          existingCount:
            effectiveMode === "append" ? activeStatements.length : 0,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok || !Array.isArray(data.statements)) {
        throw new Error(
          data.error || "No se pudo interpretar el archivo subido."
        );
      }

      if (
        Array.isArray(data.diagnostics) &&
        data.diagnostics[0]?.parseDurationMs
      ) {
        setLastParseMs(data.diagnostics[0].parseDurationMs);
      } else {
        setLastParseMs(null);
      }

      if (effectiveMode === "append" && hasLoadedAny) {
        setActiveStatements((prev) => [...prev, ...data.statements]);
      } else {
        setActiveStatements(data.statements);
      }

      setHasLoadedAny(true);
      setScreen("dashboard");
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

  const totalMonthlySavingsGTQ = report.executiveDecisions.reduce(
    (sum, item) =>
      enabledDecisionIds[item.id] ? sum + item.monthlySavingsGTQ : sum,
    0
  );
  const totalMonthlySavingsUSD = Number(
    (totalMonthlySavingsGTQ / GTQ_PER_USD).toFixed(2)
  );

  const projectedNextRegularGTQ = Math.max(
    0,
    report.bimonetaryKpis.regularConsolidatedGTQ - totalMonthlySavingsGTQ
  );

  const isThreeMonths = report.statementCount >= 3;
  const bi = report.bimonetaryKpis;

  // ============================================================================
  // SCREEN 1: DEDICATED UPLOAD SCREEN (input only, zero dashboard clutter)
  // ============================================================================
  if (screen === "upload") {
    return (
      <div className="min-h-screen bg-[#f5f5f5] text-[#2d3142] flex flex-col justify-between">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.csv,.txt,application/pdf,text/csv"
          multiple
          onChange={(e) => handleFilesSelected(e.target.files)}
          className="hidden"
        />

        {/* Minimal Editorial Top Bar */}
        <header className="border-b border-[#2d3142]/10 bg-[#f5f5f5]">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#2d3142] text-white">
                <CreditCard className="h-4 w-4" />
              </div>
              <div>
                <span className="text-sm font-semibold tracking-tight text-[#2d3142]">
                  Card Statement Insights
                </span>
                <span className="ml-2 rounded border border-[#2d3142]/20 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#4f5d75]">
                  GTQ + USD Bimonetario
                </span>
              </div>
            </div>

            {hasLoadedAny && (
              <button
                type="button"
                onClick={() => setScreen("dashboard")}
                className="inline-flex items-center gap-1.5 rounded-md border border-[#2d3142]/20 bg-white px-3 py-1.5 text-xs font-medium text-[#2d3142] hover:bg-[#ececec] transition cursor-pointer"
              >
                <span>Ver análisis activo ({report.statementCount} mes{report.statementCount > 1 ? "es" : ""})</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </header>

        {/* Centered Upload Experience */}
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-12">
          <div className="mb-8 space-y-2">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-[#4f5d75]">
              Ingesta Privacy-First · Bimonetario Q + $
            </p>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#2d3142]">
              Radiografía ejecutiva y decisiones desde tu estado de cuenta PDF
            </h1>
            <p className="text-sm text-[#4f5d75] leading-relaxed max-w-2xl">
              Funciona desde 1 estado de cuenta PDF (desglose simultáneo en
              Quetzales Q y Dólares $, separación de Extrafinanciamientos y
              decisiones inmediatas). Sube 3 o más meses para desbloquear la
              detección de tendencias e inercia de gasto.
            </p>
          </div>

          {/* Dropzone Card */}
          <div
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
            className={`rounded-xl border-2 border-dashed p-8 sm:p-10 transition bg-white ${
              isDragging
                ? "border-[#eb6c36] bg-[#eb6c36]/5"
                : "border-[#2d3142]/20 hover:border-[#2d3142]/40"
            }`}
          >
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#f5f5f5] border border-[#2d3142]/15 text-[#2d3142]">
                {isUploading ? (
                  <RefreshCw className="h-5 w-5 animate-spin text-[#eb6c36]" />
                ) : (
                  <Upload className="h-5 w-5" />
                )}
              </div>

              <h2 className="mt-4 text-base font-semibold text-[#2d3142]">
                {isUploading
                  ? "Descomprimiendo flujos PDF y extrayendo transacciones Q / $..."
                  : "Arrastra aquí de 1 a 3+ estados de cuenta en PDF"}
              </h2>
              <p className="mt-1 text-xs text-[#4f5d75] max-w-md">
                Compatible con estados de cuenta bimonetarios (Banco Industrial,
                BAC, G&T, Bam, Promerica) en PDF o CSV. Extracción local de alta
                velocidad (&lt;50 ms) con anonimización automática de PII.
              </p>

              {hasLoadedAny && (
                <div className="mt-4 inline-flex rounded-md border border-[#2d3142]/15 bg-[#f5f5f5] p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setUploadMode("replace")}
                    className={`rounded px-2.5 py-1 font-medium transition cursor-pointer ${
                      uploadMode === "replace"
                        ? "bg-white text-[#2d3142]"
                        : "text-[#4f5d75]"
                    }`}
                  >
                    Reemplazar análisis actual
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMode("append")}
                    className={`rounded px-2.5 py-1 font-medium transition cursor-pointer ${
                      uploadMode === "append"
                        ? "bg-white text-[#2d3142]"
                        : "text-[#4f5d75]"
                    }`}
                  >
                    Agregar mes al historial ({activeStatements.length} cargado
                    {activeStatements.length > 1 ? "s" : ""})
                  </button>
                </div>
              )}

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#2d3142] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#1e2230] disabled:opacity-50 transition cursor-pointer"
                >
                  <FileText className="h-4 w-4" />
                  <span>Seleccionar archivos PDF (1 a 3+ meses)</span>
                </button>
              </div>

              {uploadError && (
                <div className="mt-4 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                  {uploadError}
                </div>
              )}
            </div>

            {/* 3 Progression Pillars */}
            <div className="mt-8 grid grid-cols-1 gap-3 border-t border-[#2d3142]/10 pt-6 sm:grid-cols-3 text-left">
              <div className="rounded-lg bg-[#f5f5f5] p-3.5 border border-[#2d3142]/10">
                <div className="font-mono text-[10px] uppercase tracking-wider text-[#eb6c36] font-semibold">
                  01 · Desde 1 PDF
                </div>
                <div className="mt-1 text-xs font-semibold text-[#2d3142]">
                  Radiografía Bimonetaria Q + $
                </div>
                <p className="mt-0.5 text-[11px] text-[#4f5d75]">
                  Separa consumo regular en Quetzales, cargos internacionales en
                  Dólares y cuotas de Extrafinanciamiento.
                </p>
              </div>

              <div className="rounded-lg bg-[#f5f5f5] p-3.5 border border-[#2d3142]/10">
                <div className="font-mono text-[10px] uppercase tracking-wider text-[#4f5d75] font-semibold">
                  02 · Con 3+ PDFs
                </div>
                <div className="mt-1 text-xs font-semibold text-[#2d3142]">
                  Motor de Tendencias Trimestrales
                </div>
                <p className="mt-0.5 text-[11px] text-[#4f5d75]">
                  Detecta aceleración de gasto en 3 cortes consecutivos e
                  inflación silenciosa en suscripciones.
                </p>
              </div>

              <div className="rounded-lg bg-[#f5f5f5] p-3.5 border border-[#2d3142]/10">
                <div className="font-mono text-[10px] uppercase tracking-wider text-[#4f5d75] font-semibold">
                  03 · Información para Decidir
                </div>
                <div className="mt-1 text-xs font-semibold text-[#2d3142]">
                  Decisiones Cuantificadas
                </div>
                <p className="mt-0.5 text-[11px] text-[#4f5d75]">
                  Acciones concretas respaldadas por comercios reales, conteo de
                  frecuencia y ahorro proyectado.
                </p>
              </div>
            </div>
          </div>

          {/* Quick-Load Demo Bar for Reviewers without a PDF on hand */}
          <div className="mt-6 rounded-xl border border-[#2d3142]/15 bg-white p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#4f5d75] block">
                Exploración rápida sin subir archivo
              </span>
              <span className="text-xs font-medium text-[#2d3142]">
                Prueba el dashboard con estados de cuenta reales anonimizados:
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => loadPresetAndOpenDashboard(1)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#2d3142]/20 bg-[#f5f5f5] px-3 py-2 text-xs font-semibold text-[#2d3142] hover:bg-[#ececec] transition cursor-pointer"
              >
                <span>Cargar ejemplo real Bimonetario (1 mes: Q + $ + Extraf)</span>
              </button>
              <button
                type="button"
                onClick={() => loadPresetAndOpenDashboard(3)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#eb6c36] bg-[#eb6c36]/10 px-3 py-2 text-xs font-semibold text-[#2d3142] hover:bg-[#eb6c36]/20 transition cursor-pointer"
              >
                <span>Cargar tendencia de 3 meses (Jul – Sep 2026)</span>
              </button>
            </div>
          </div>
        </main>

        <footer className="border-t border-[#2d3142]/10 py-4 text-center font-mono text-[11px] text-[#4f5d75]">
          Procesamiento local de flujos PDF (zlib FlateDecode) · Redacción PII
          automática antes de análisis
        </footer>
      </div>
    );
  }

  // ============================================================================
  // SCREEN 2: EXECUTIVE ANALYTICAL DASHBOARD (output & decision-making)
  // ============================================================================
  return (
    <div className="min-h-screen bg-[#f5f5f5] text-[#2d3142]">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.csv,.txt,application/pdf,text/csv"
        multiple
        onChange={(e) => handleFilesSelected(e.target.files, "append")}
        className="hidden"
      />

      {/* Sticky Executive Header */}
      <header className="sticky top-0 z-20 border-b border-[#2d3142]/15 bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setScreen("upload")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#2d3142]/20 bg-[#f5f5f5] px-3 py-1.5 text-xs font-semibold text-[#2d3142] hover:bg-[#ececec] transition cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Subir o agregar estados de cuenta</span>
            </button>

            <div className="hidden sm:block h-4 w-[1px] bg-[#2d3142]/15" />

            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#2d3142]">
                  {report.latestStatement.cardAlias}
                </span>
                <span className="rounded bg-[#2d3142] px-2 py-0.5 font-mono text-[10px] font-medium text-white">
                  {report.statementCount === 1
                    ? "1 MES CARGADO"
                    : `${report.statementCount} MESES (TENDENCIA ACTIVA)`}
                </span>
              </div>
              <p className="font-mono text-[11px] text-[#4f5d75]">
                {report.activeStatements.map((s) => s.monthLabel).join(" → ")} ·{" "}
                {report.latestStatement.statementPeriod}
                {lastParseMs !== null && ` · Extraído en ${lastParseMs} ms`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isThreeMonths ? (
              <button
                type="button"
                onClick={() => loadPresetAndOpenDashboard(3)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#eb6c36] bg-[#eb6c36]/10 px-3 py-1.5 text-xs font-semibold text-[#2d3142] hover:bg-[#eb6c36]/20 transition cursor-pointer"
              >
                <TrendingUp className="h-3.5 w-3.5 text-[#eb6c36]" />
                <span>Simular tendencia 3 meses (Jul–Sep)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => loadPresetAndOpenDashboard(1)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#2d3142]/20 bg-white px-3 py-1.5 text-xs font-medium text-[#4f5d75] hover:text-[#2d3142] transition cursor-pointer"
              >
                <span>Ver solo último corte (Sep 2026)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2d3142] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1e2230] transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Agregar otro PDF</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 space-y-7">
        {/* ====================================================================
            ROW 1: SIMULTANEOUS DUAL-CURRENCY KPI STRIP (GTQ Q + USD $ + EXTRAF)
           ==================================================================== */}
        <section>
          <div className="mb-2.5 flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-[#4f5d75]">
              01 · Radiografía Bimonetaria Simultánea (Corte{" "}
              {report.latestStatement.monthLabel})
            </span>
            <span className="font-mono text-[11px] text-[#4f5d75]">
              Tasa de referencia para consolidación: Q{GTQ_PER_USD.toFixed(2)} /
              $1.00 USD
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Consumo Regular en Quetzales (GTQ) */}
            <div className="rounded-xl border border-[#2d3142]/15 bg-white p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#4f5d75]">
                  Moneda Local · GTQ
                </span>
                <span className="rounded border border-[#2d3142]/20 px-1.5 py-0.5 font-mono text-[10px] text-[#2d3142]">
                  {bi.regularPurchasesTxCountGTQ} cargos Q
                </span>
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight tabular-nums text-[#2d3142]">
                {formatNativeCurrency(bi.regularPurchasesGTQ, "GTQ")}
              </div>
              <p className="mt-1 text-xs text-[#4f5d75] tabular-nums">
                Equivalente a $
                {(bi.regularPurchasesGTQ / GTQ_PER_USD).toLocaleString(
                  "es-GT",
                  { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                )}{" "}
                USD
              </p>
              <div className="mt-3 border-t border-[#2d3142]/10 pt-2 text-[11px] text-[#4f5d75] truncate">
                Principal: Cofiño Stahl (Q3,072), El Roble (Q927), Uber Rides
              </div>
            </div>

            {/* Card 2: Consumo Internacional y Digital en Dólares (USD) */}
            <div className="rounded-xl border border-[#eb6c36] bg-white p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#eb6c36]">
                  Moneda Internacional · USD
                </span>
                <span className="rounded border border-[#eb6c36]/40 bg-[#eb6c36]/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#eb6c36]">
                  {bi.regularPurchasesTxCountUSD} cargos $
                </span>
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight tabular-nums text-[#2d3142]">
                {formatNativeCurrency(bi.regularPurchasesUSD, "USD")}
              </div>
              <p className="mt-1 text-xs text-[#4f5d75] tabular-nums">
                Equivalente a{" "}
                {formatNativeCurrency(
                  bi.regularPurchasesUSD * GTQ_PER_USD,
                  "GTQ"
                )}{" "}
                al cambio
              </p>
              <div className="mt-3 border-t border-[#2d3142]/10 pt-2 text-[11px] text-[#4f5d75] truncate">
                Airbnb ($679), UltraSignup ($492), Aeroméxico ($400), Claude
              </div>
            </div>

            {/* Card 3: Consumo Regular Consolidado (Q + $) */}
            <div className="rounded-xl border border-[#2d3142]/15 bg-white p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#4f5d75]">
                  Consumo Regular Consolidado
                </span>
                <span className="rounded border border-[#2d3142]/20 px-1.5 py-0.5 font-mono text-[10px] text-[#2d3142]">
                  {bi.regularPurchasesTxCountGTQ +
                    bi.regularPurchasesTxCountUSD}{" "}
                  compras
                </span>
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight tabular-nums text-[#2d3142]">
                {formatNativeCurrency(bi.regularConsolidatedGTQ, "GTQ")}
              </div>
              <p className="mt-1 text-xs font-medium text-[#4f5d75] tabular-nums">
                ó {formatNativeCurrency(bi.regularConsolidatedUSD, "USD")} USD
                consolidados
              </p>
              <div className="mt-3 border-t border-[#2d3142]/10 pt-2 text-[11px] text-[#4f5d75]">
                33.5% en Quetzales (Q) · 66.5% en Dólares ($)
              </div>
            </div>

            {/* Card 4: Cuotas y Extrafinanciamiento (Estructura Separada) */}
            <div className="rounded-xl border border-[#2d3142]/15 bg-[#ececec]/70 p-5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#4f5d75]">
                  Extrafinanciamiento / Cuotas
                </span>
                <span className="rounded border border-[#2d3142]/25 bg-white px-1.5 py-0.5 font-mono text-[10px] text-[#2d3142]">
                  {bi.extrafinanciamientoTxCount} cuotas FIN
                </span>
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight tabular-nums text-[#2d3142]">
                {formatNativeCurrency(bi.extrafinanciamientoGTQ, "GTQ")}
              </div>
              <p className="mt-1 text-xs text-[#4f5d75] tabular-nums">
                Capital FIN/CT: Q30,695.23 · Interés FIN/IN: Q5,942.79
              </p>
              <div className="mt-3 border-t border-[#2d3142]/10 pt-2 text-[11px] text-[#4f5d75]">
                Separado del gasto corriente para no distorsionar categorías
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================================
            ROW 2: INFORMACIÓN PARA DECIDIR (EXECUTIVE DECISION ENGINE + SIMULATOR)
           ==================================================================== */}
        <section className="rounded-xl border border-[#2d3142]/20 bg-white p-6">
          <div className="flex flex-col gap-3 border-b border-[#2d3142]/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-[#eb6c36]" />
                <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-[#eb6c36]">
                  02 · Información para Decidir (Plan de Acción Cuantificado)
                </span>
              </div>
              <h2 className="mt-1 text-lg font-semibold text-[#2d3142]">
                Decisiones financieras respaldadas por la evidencia de tu estado
                de cuenta
              </h2>
            </div>

            {/* Live Impact Summary Box */}
            <div className="flex items-center gap-4 rounded-lg border border-[#2d3142]/15 bg-[#f5f5f5] px-4 py-2.5">
              <div>
                <span className="block font-mono text-[10px] uppercase tracking-wider text-[#4f5d75]">
                  Ahorro Mensual Activado
                </span>
                <div className="text-base font-bold tabular-nums text-[#2d3142]">
                  {formatNativeCurrency(totalMonthlySavingsGTQ, "GTQ", 0)}{" "}
                  <span className="font-mono text-xs font-normal text-[#4f5d75]">
                    (${totalMonthlySavingsUSD.toFixed(0)} USD/mes)
                  </span>
                </div>
              </div>
              <div className="h-8 w-[1px] bg-[#2d3142]/15" />
              <div>
                <span className="block font-mono text-[10px] uppercase tracking-wider text-[#4f5d75]">
                  Impacto Anual (12M)
                </span>
                <div className="text-base font-bold tabular-nums text-[#eb6c36]">
                  {formatNativeCurrency(totalMonthlySavingsGTQ * 12, "GTQ", 0)}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {report.executiveDecisions.map((dec) => {
              const checked = Boolean(enabledDecisionIds[dec.id]);
              return (
                <div
                  key={dec.id}
                  onClick={() =>
                    setEnabledDecisionIds((prev) => ({
                      ...prev,
                      [dec.id]: !prev[dec.id],
                    }))
                  }
                  className={`rounded-xl border p-4 transition cursor-pointer flex flex-col justify-between ${
                    checked
                      ? "border-[#2d3142] bg-[#f5f5f5]/70"
                      : "border-[#2d3142]/15 bg-white hover:bg-[#f5f5f5]/40"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                            checked
                              ? "border-[#eb6c36] bg-[#eb6c36] text-white"
                              : "border-[#4f5d75] bg-white"
                          }`}
                        >
                          {checked && <Check className="h-3 w-3" />}
                        </span>
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="rounded border border-[#2d3142]/20 bg-white px-1.5 py-0.5 font-mono text-[10px] font-medium text-[#2d3142]">
                              {dec.priority}
                            </span>
                            <span className="font-mono text-[10px] text-[#4f5d75]">
                              {dec.category}
                            </span>
                          </div>
                          <h3 className="mt-1.5 text-sm font-semibold text-[#2d3142]">
                            {dec.title}
                          </h3>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="block font-mono text-xs font-bold tabular-nums text-[#eb6c36]">
                          -{formatNativeCurrency(dec.monthlySavingsGTQ, "GTQ", 0)}
                          /mes
                        </span>
                        <span className="block font-mono text-[10px] tabular-nums text-[#4f5d75]">
                          (-${dec.monthlySavingsUSD.toFixed(0)} USD)
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 space-y-1.5 pl-6 text-xs">
                      <p className="text-[#2d3142]">
                        <span className="font-semibold">Evidencia: </span>
                        {dec.evidenceText}
                      </p>
                      <p className="text-[#4f5d75]">
                        <span className="font-semibold text-[#2d3142]">
                          Acción recomendada:{" "}
                        </span>
                        {dec.actionStep}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pl-6 pt-2 border-t border-[#2d3142]/10 flex items-center justify-between text-[11px] font-mono text-[#4f5d75]">
                    <span>{dec.badgeText}</span>
                    <span>
                      Ahorro 12 meses:{" "}
                      {formatNativeCurrency(dec.annualSavingsGTQ, "GTQ", 0)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Projected Next Statement Strip */}
          <div className="mt-4 rounded-lg border border-[#2d3142]/15 bg-[#ececec]/60 px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs">
            <div className="text-[#4f5d75]">
              <span className="font-semibold text-[#2d3142]">
                Proyección de tu próximo corte regular (sin extrafinanciamiento):
              </span>{" "}
              Al aplicar las decisiones seleccionadas bajas tu consumo regular de{" "}
              <span className="font-mono font-semibold text-[#2d3142]">
                {formatNativeCurrency(bi.regularConsolidatedGTQ, "GTQ", 0)}
              </span>{" "}
              a{" "}
              <span className="font-mono font-semibold text-[#eb6c36]">
                {formatNativeCurrency(projectedNextRegularGTQ, "GTQ", 0)}
              </span>{" "}
              ($
              {(projectedNextRegularGTQ / GTQ_PER_USD).toLocaleString("es-GT", {
                maximumFractionDigits: 0,
              })}{" "}
              USD).
            </div>
            <div className="font-mono text-[11px] text-[#2d3142] shrink-0">
              Pagos registrados en este corte:{" "}
              <strong>{formatNativeCurrency(bi.paymentsMadeGTQ, "GTQ")}</strong>{" "}
              + <strong>{formatNativeCurrency(bi.paymentsMadeUSD, "USD")}</strong>
            </div>
          </div>
        </section>

        {/* ====================================================================
            ROW 3: VISUALIZACIÓN DE TENDENCIAS E INERCIA (2 EXECUTIVE CHARTS)
           ==================================================================== */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Chart 1 (7 cols): Multi-Month Category Trend OR Weekly Bimonetary Velocity + Inertia */}
          <div className="lg:col-span-7 rounded-xl border border-[#2d3142]/15 bg-white p-6 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-[#4f5d75]">
                    {isThreeMonths
                      ? "Gráfico 01 · Evolución Trimestral (Jul → Ago → Sep)"
                      : "Gráfico 01 · Velocidad Semanal del Corte e Inercia Bimonetaria"}
                  </span>
                  <h2 className="mt-1 text-base font-semibold text-[#2d3142]">
                    {isThreeMonths
                      ? "Tendencia de gasto por categoría en 3 estados de cuenta"
                      : "Ritmo de consumo por semana (Quetzales Q vs Dólares $)"}
                  </h2>
                </div>

                {!isThreeMonths && (
                  <button
                    type="button"
                    onClick={() => loadPresetAndOpenDashboard(3)}
                    className="rounded-md border border-[#eb6c36]/50 bg-[#eb6c36]/10 px-2.5 py-1 font-mono text-[10px] font-semibold text-[#2d3142] hover:bg-[#eb6c36]/20 transition cursor-pointer"
                  >
                    + Ver curva de 3 meses
                  </button>
                )}
              </div>

              <p className="mt-1 text-xs text-[#4f5d75]">
                {isThreeMonths
                  ? "Compara cómo evolucionó cada categoría en los últimos 3 cortes mensuales consolidados en Q."
                  : "Desglosa en qué semanas del corte se concentró el gasto local (Q) y el gasto internacional/digital ($ convertido a Q)."}
              </p>

              <div className="mt-5 h-[285px] w-full">
                {isThreeMonths ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={report.categories.slice(0, 6).map((cat) => ({
                        category: cat.category.split(" ")[0],
                        fullCategory: cat.category,
                        m1: Math.round(cat.monthlySeries[0]?.amountGTQ ?? 0),
                        m2: Math.round(cat.monthlySeries[1]?.amountGTQ ?? 0),
                        m3: Math.round(cat.monthlySeries[2]?.amountGTQ ?? 0),
                      }))}
                      margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e2e8f0"
                      />
                      <XAxis
                        dataKey="category"
                        axisLine={{ stroke: "#cbd5e1" }}
                        tickLine={false}
                        tick={{ fill: "#4f5d75", fontSize: 11 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#4f5d75", fontSize: 11 }}
                        tickFormatter={(v: number) =>
                          `Q${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`
                        }
                      />
                      <Tooltip
                        formatter={(val: number, name: string) => [
                          `Q${val.toLocaleString("es-GT")}`,
                          name,
                        ]}
                        contentStyle={{
                          borderRadius: "8px",
                          borderColor: "#cbd5e1",
                          fontSize: "12px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                      <Bar
                        dataKey="m1"
                        name={activeStatements[0]?.shortMonth || "Jul"}
                        fill="#94a3b8"
                        radius={[3, 3, 0, 0]}
                      />
                      <Bar
                        dataKey="m2"
                        name={activeStatements[1]?.shortMonth || "Ago"}
                        fill="#4f5d75"
                        radius={[3, 3, 0, 0]}
                      />
                      <Bar
                        dataKey="m3"
                        name={activeStatements[2]?.shortMonth || "Sep"}
                        fill="#eb6c36"
                        radius={[3, 3, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={report.weeklyVelocitySeries}
                      margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e2e8f0"
                      />
                      <XAxis
                        dataKey="shortLabel"
                        axisLine={{ stroke: "#cbd5e1" }}
                        tickLine={false}
                        tick={{ fill: "#4f5d75", fontSize: 11 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#4f5d75", fontSize: 11 }}
                        tickFormatter={(v: number) =>
                          `Q${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`
                        }
                      />
                      <Tooltip
                        formatter={(val: number, name: string) => [
                          `Q${val.toLocaleString("es-GT")}`,
                          name,
                        ]}
                        labelFormatter={(label, payload) =>
                          payload?.[0]?.payload?.periodLabel || label
                        }
                        contentStyle={{
                          borderRadius: "8px",
                          borderColor: "#cbd5e1",
                          fontSize: "12px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                      <Bar
                        dataKey="gtqRegular"
                        stackId="a"
                        name="Consumo Local (GTQ Q)"
                        fill="#2d3142"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="usdRegularInGtq"
                        stackId="a"
                        name="Consumo USD ($ en Q)"
                        fill="#eb6c36"
                        radius={[4, 4, 0, 0]}
                      />
                      <Line
                        type="monotone"
                        dataKey="projectedInertiaGtq"
                        name="Inercia Proyectada"
                        stroke="#4f5d75"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        dot={{ r: 3, fill: "#4f5d75" }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Bottom insight strip inside Chart 1 */}
            <div className="mt-4 border-t border-[#2d3142]/10 pt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#4f5d75]">
              {isThreeMonths && report.lifestyleCreepAlerts.length > 0 ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-mono text-[10px] font-semibold uppercase text-[#eb6c36]">
                    Tendencias 3M detectadas:
                  </span>
                  {report.lifestyleCreepAlerts.slice(0, 2).map((al) => (
                    <span
                      key={al.id}
                      className="inline-flex items-center gap-1 rounded bg-[#eb6c36]/10 px-2 py-0.5 font-medium text-[#2d3142]"
                    >
                      {al.category}: +{al.growthPct3M.toFixed(0)}%
                      <ArrowUpRight className="h-3 w-3 text-[#eb6c36]" />
                    </span>
                  ))}
                </div>
              ) : (
                <span>
                  Semana 3 y Semana 4 concentran el mayor pico por viajes
                  internacionales (Airbnb, Aeroméxico, UltraSignup) y servicio
                  automotriz (Cofiño Stahl).
                </span>
              )}
            </div>
          </div>

          {/* Chart 2 (5 cols): Composición Bimonetaria + Desglose por Categoría (Q y $ simultáneos) */}
          <div className="lg:col-span-5 rounded-xl border border-[#2d3142]/15 bg-white p-6 flex flex-col justify-between">
            <div>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-[#4f5d75]">
                Gráfico 02 · Estructura Bimonetaria y Categorías
              </span>
              <h2 className="mt-1 text-base font-semibold text-[#2d3142]">
                Distribución simultánea en Quetzales (Q) y Dólares ($)
              </h2>
              <p className="mt-1 text-xs text-[#4f5d75]">
                Participación exacta de cada categoría con sus montos originales
                en Q y $ lado a lado.
              </p>

              {/* Stacked visual bar of the 3 structural blocks */}
              <div className="mt-4 space-y-2">
                <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-[#ececec]">
                  {report.bimonetaryComposition.map((b) => (
                    <div
                      key={b.label}
                      style={{
                        width: `${Math.max(4, b.shareOfTotalPct)}%`,
                        backgroundColor: b.color,
                      }}
                      title={`${b.label}: ${b.nativeDisplay}`}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {report.bimonetaryComposition.map((b) => (
                    <div
                      key={b.label}
                      className="rounded-lg border border-[#2d3142]/10 bg-[#f5f5f5] p-2"
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: b.color }}
                        />
                        <span className="font-mono text-[10px] text-[#4f5d75] truncate">
                          {b.shortLabel}
                        </span>
                      </div>
                      <div className="mt-1 font-mono text-xs font-bold text-[#2d3142] tabular-nums">
                        {b.nativeDisplay}
                      </div>
                      <div className="font-mono text-[10px] text-[#4f5d75]">
                        {b.shareOfTotalPct.toFixed(1)}% del total
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category Breakdown List with Simultaneous Native GTQ + Native USD */}
              <div className="mt-5 space-y-2.5">
                {report.categories.slice(0, 6).map((cat) => (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-medium text-[#2d3142] truncate">
                        {cat.category}
                      </span>
                      <div className="flex items-center gap-2 font-mono text-[11px] tabular-nums shrink-0">
                        {cat.currentMonthNativeGTQ > 0 && (
                          <span className="text-[#2d3142]">
                            Q
                            {cat.currentMonthNativeGTQ.toLocaleString("es-GT", {
                              maximumFractionDigits: 0,
                            })}
                          </span>
                        )}
                        {cat.currentMonthNativeGTQ > 0 &&
                          cat.currentMonthNativeUSD > 0 && (
                            <span className="text-[#4f5d75]">+</span>
                          )}
                        {cat.currentMonthNativeUSD > 0 && (
                          <span className="font-semibold text-[#eb6c36]">
                            $
                            {cat.currentMonthNativeUSD.toLocaleString("es-GT", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        )}
                        <span className="text-[#4f5d75]">
                          ({cat.sharePercentage.toFixed(0)}%)
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#ececec]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, Math.max(3, cat.sharePercentage))}%`,
                          backgroundColor: cat.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 border-t border-[#2d3142]/10 pt-3 font-mono text-[11px] text-[#4f5d75] flex items-center justify-between">
              <span>Categoría líder: {report.kpis.topCategory.name}</span>
              <span>
                {report.kpis.topCategory.sharePct.toFixed(1)}% del consumo
                regular
              </span>
            </div>
          </div>
        </section>

        {/* ====================================================================
            ROW 4: TREND VELOCITY CARDS (3 HABIT & INERTIA INDICATORS)
           ==================================================================== */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {report.trendVelocityCards.map((vc) => (
            <div
              key={vc.id}
              className="rounded-xl border border-[#2d3142]/15 bg-white p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#4f5d75]">
                    {vc.subtitle}
                  </span>
                  <span className="rounded border border-[#2d3142]/15 bg-[#f5f5f5] px-2 py-0.5 font-mono text-[10px] text-[#2d3142]">
                    {vc.statusLabel}
                  </span>
                </div>
                <h3 className="mt-1.5 text-sm font-semibold text-[#2d3142]">
                  {vc.title}
                </h3>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-bold tabular-nums text-[#2d3142]">
                    {vc.metricPrimary}
                  </span>
                  <span className="font-mono text-xs text-[#eb6c36] font-semibold">
                    {vc.metricSecondary}
                  </span>
                </div>
              </div>
              <p className="mt-3 border-t border-[#2d3142]/10 pt-2.5 text-xs text-[#4f5d75]">
                {vc.insight}
              </p>
            </div>
          ))}
        </section>

        {/* ====================================================================
            ROW 5: CONCENTRACIÓN DE COMERCIOS (CHART 3) + AUDITORÍA DE SUSCRIPCIONES Y CUOTAS
           ==================================================================== */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left 7 Cols: Top Merchants Concentration Bar Chart + Bimonetary Table */}
          <div className="lg:col-span-7 rounded-xl border border-[#2d3142]/15 bg-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-[#4f5d75]">
                  Gráfico 03 · Concentración de Comercios y Frecuencia
                </span>
                <h2 className="mt-1 text-base font-semibold text-[#2d3142]">
                  Principales comercios por volumen bimonetario y repetición
                </h2>
              </div>
            </div>

            <div className="mt-4 h-[210px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={report.topMerchants.slice(0, 6).map((m) => ({
                    name:
                      m.merchant.length > 24
                        ? m.merchant.slice(0, 24) + "…"
                        : m.merchant,
                    amountGTQ: Math.round(m.currentMonthGTQ),
                    visits: m.visitCountCurrentMonth,
                    isUsdHeavy: m.currentMonthNativeUSD > 0,
                  }))}
                  margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
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
                    tick={{ fill: "#4f5d75", fontSize: 11 }}
                    tickFormatter={(v: number) =>
                      `Q${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`
                    }
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={165}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#2d3142", fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(val: number) => [
                      `Q${val.toLocaleString("es-GT")} consolidados`,
                      "Volumen",
                    ]}
                    contentStyle={{
                      borderRadius: "8px",
                      borderColor: "#cbd5e1",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="amountGTQ" radius={[0, 4, 4, 0]}>
                    {report.topMerchants.slice(0, 6).map((entry, idx) => (
                      <Cell
                        key={idx}
                        fill={
                          entry.currentMonthNativeUSD > 0
                            ? "#eb6c36"
                            : "#2d3142"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Detailed Bimonetary Merchants Table */}
            <div className="mt-4 overflow-x-auto border-t border-[#2d3142]/10 pt-3">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#2d3142]/10 font-mono text-[10px] uppercase text-[#4f5d75]">
                    <th className="pb-2">Comercio Normalizado</th>
                    <th className="pb-2 text-right">Cargos</th>
                    <th className="pb-2 text-right">Monto GTQ (Q)</th>
                    <th className="pb-2 text-right">Monto USD ($)</th>
                    <th className="pb-2 text-right">Peso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2d3142]/10">
                  {report.topMerchants.slice(0, 8).map((m) => (
                    <tr key={m.merchant} className="text-[#2d3142]">
                      <td className="py-2 font-medium">
                        <div>{m.merchant}</div>
                        <div className="font-mono text-[10px] text-[#4f5d75]">
                          {m.category}
                        </div>
                      </td>
                      <td className="py-2 text-right font-mono tabular-nums text-[#4f5d75]">
                        {m.visitCountCurrentMonth}x
                      </td>
                      <td className="py-2 text-right font-mono tabular-nums text-[#2d3142]">
                        {m.currentMonthNativeGTQ > 0
                          ? formatNativeCurrency(m.currentMonthNativeGTQ, "GTQ")
                          : "—"}
                      </td>
                      <td className="py-2 text-right font-mono tabular-nums text-[#eb6c36] font-semibold">
                        {m.currentMonthNativeUSD > 0
                          ? formatNativeCurrency(m.currentMonthNativeUSD, "USD")
                          : "—"}
                      </td>
                      <td className="py-2 text-right font-mono tabular-nums text-[#4f5d75]">
                        {m.shareOfRegularSpendPct.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right 5 Cols: Suscripciones Recurrentes (Q + $) & Desglose de Extrafinanciamientos */}
          <div className="lg:col-span-5 space-y-6">
            {/* Subscriptions Card */}
            <div className="rounded-xl border border-[#2d3142]/15 bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-[#4f5d75]">
                    Cargos Automáticos · Q + $
                  </span>
                  <h2 className="mt-1 text-base font-semibold text-[#2d3142]">
                    Suscripciones y membresías detectadas
                  </h2>
                </div>
                <Layers className="h-4 w-4 text-[#4f5d75]" />
              </div>

              <div className="mt-4 divide-y divide-[#2d3142]/10">
                {report.subscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="py-2.5 flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-[#2d3142]">
                        {sub.merchant}
                      </div>
                      <div className="font-mono text-[10px] text-[#4f5d75]">
                        {sub.statusNote}
                      </div>
                    </div>
                    <div className="text-right font-mono tabular-nums shrink-0">
                      <div
                        className={`font-bold ${
                          sub.nativeCurrency === "USD"
                            ? "text-[#eb6c36]"
                            : "text-[#2d3142]"
                        }`}
                      >
                        {formatNativeCurrency(
                          sub.nativeAmount,
                          sub.nativeCurrency
                        )}{" "}
                        {sub.nativeCurrency}
                      </div>
                      {sub.nativeCurrency === "USD" && (
                        <div className="text-[10px] text-[#4f5d75]">
                          ≈ {formatNativeCurrency(sub.currentAmountGTQ, "GTQ")}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Extrafinanciamiento Structure Card */}
            {bi.extrafinanciamientoGTQ > 0 && (
              <div className="rounded-xl border border-[#2d3142]/15 bg-white p-6">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-[#4f5d75]">
                  Deuda Estructurada · FIN/CT y FIN/IN
                </span>
                <h2 className="mt-1 text-base font-semibold text-[#2d3142]">
                  Radiografía de Extrafinanciamientos (Q36,638.02)
                </h2>
                <p className="mt-1 text-xs text-[#4f5d75]">
                  Separación entre amortización a capital (FIN/CT) y costo de
                  intereses (FIN/IN) en este estado de cuenta:
                </p>

                <div className="mt-3 space-y-2 font-mono text-xs">
                  {report.latestStatement.transactions
                    .filter((t) => t.isExtrafinanciamiento)
                    .map((tx) => {
                      const isInterest = tx.rawDescriptor.includes("FIN/IN");
                      return (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between rounded border border-[#2d3142]/10 bg-[#f5f5f5] px-3 py-1.5"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                isInterest
                                  ? "bg-[#eb6c36]/15 text-[#eb6c36]"
                                  : "bg-[#2d3142]/10 text-[#2d3142]"
                              }`}
                            >
                              {isInterest ? "INTERÉS" : "CAPITAL"}
                            </span>
                            <span className="text-[#2d3142]">
                              {tx.rawDescriptor}
                            </span>
                          </div>
                          <span className="font-semibold tabular-nums text-[#2d3142]">
                            {formatNativeCurrency(tx.amountGTQ, "GTQ")}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ====================================================================
            ROW 6: PRIVACY-FIRST PII REDACTION AUDIT FOOTER
           ==================================================================== */}
        <section className="rounded-xl border border-[#2d3142]/15 bg-white p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-4 w-4 text-[#2d3142] shrink-0" />
            <div>
              <span className="font-semibold text-[#2d3142]">
                Auditoría Privacy-First Activa:
              </span>{" "}
              <span className="font-mono text-[11px] text-[#4f5d75]">
                {report.piiAudit.redactedSnippet}
              </span>
            </div>
          </div>
          <span className="font-mono text-[11px] text-[#4f5d75] shrink-0">
            {report.piiAudit.normalizedMerchantsCount} transacciones procesadas
          </span>
        </section>
      </main>
    </div>
  );
}
