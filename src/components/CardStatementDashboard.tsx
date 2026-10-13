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
  PieChart,
  Pie,
} from "recharts";
import {
  CreditCard,
  Upload,
  Check,
  TrendingUp,
  SlidersHorizontal,
  Plus,
  BarChart3,
  ListFilter,
  Search,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  CardStatement,
  analyzeStatements,
  formatNativeCurrency,
  GTQ_PER_USD,
} from "@/lib/statementAnalyzer";
import { DEMO_STATEMENTS } from "@/lib/demoStatements";

type DashboardTab = "graficas" | "tendencias" | "decisiones" | "movimientos";
type CurrencyFilter = "all" | "GTQ" | "USD" | "cuotas";

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
  const [screen, setScreen] = useState<"upload" | "dashboard">("upload");
  const [activeTab, setActiveTab] = useState<DashboardTab>("graficas");

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

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analyzingCount, setAnalyzingCount] = useState<number>(1);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDraggingUpload, setIsDraggingUpload] = useState<boolean>(false);
  const [isDraggingDashboard, setIsDraggingDashboard] =
    useState<boolean>(false);

  // Movimientos tab filters
  const [txFilter, setTxFilter] = useState<CurrencyFilter>("all");
  const [txSearch, setTxSearch] = useState<string>("");
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>("all");

  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const addMoreInputRef = useRef<HTMLInputElement | null>(null);

  const report = useMemo(
    () => analyzeStatements(activeStatements),
    [activeStatements]
  );

  const loadPresetAndOpenDashboard = async (count: 1 | 3) => {
    setUploadError(null);
    setAnalyzingCount(count);
    setIsAnalyzing(true);

    await new Promise((resolve) => setTimeout(resolve, 450));

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
    setIsAnalyzing(false);
    setScreen("dashboard");
  };

  const processFiles = async (
    filesArray: File[],
    mode: "replace" | "append"
  ) => {
    if (!filesArray || filesArray.length === 0) return;

    const validFiles = filesArray.filter(
      (f) =>
        f.name.toLowerCase().endsWith(".pdf") ||
        f.name.toLowerCase().endsWith(".csv") ||
        f.name.toLowerCase().endsWith(".txt") ||
        f.type === "application/pdf" ||
        f.type === "text/csv"
    );

    const targetFiles = validFiles.length > 0 ? validFiles : filesArray;

    setAnalyzingCount(targetFiles.length);
    setIsAnalyzing(true);
    setUploadError(null);

    try {
      const startMs = Date.now();
      const filesPayload: {
        name: string;
        mimeType: string;
        base64Data: string;
      }[] = [];

      for (let i = 0; i < targetFiles.length; i++) {
        const file = targetFiles[i];
        const buffer = await file.arrayBuffer();
        filesPayload.push({
          name: file.name,
          mimeType: file.type || "application/pdf",
          base64Data: arrayBufferToBase64(buffer),
        });
      }

      const existingCount = mode === "append" ? activeStatements.length : 0;

      const res = await fetch("/api/analyze-statements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: filesPayload,
          existingCount,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok || !Array.isArray(data.statements)) {
        throw new Error(
          data.error || "No se pudo interpretar el archivo subido."
        );
      }

      // Ensure loading banner is visible for at least 600ms so user sees feedback clearly
      const elapsed = Date.now() - startMs;
      if (elapsed < 600) {
        await new Promise((r) => setTimeout(r, 600 - elapsed));
      }

      if (mode === "append") {
        setActiveStatements((prev) => [...prev, ...data.statements]);
        setActiveTab("tendencias");
      } else {
        setActiveStatements(data.statements);
        if (data.statements.length >= 2) {
          setActiveTab("tendencias");
        } else {
          setActiveTab("graficas");
        }
      }

      setHasLoadedAny(true);
      setScreen("dashboard");
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : "Error al analizar el estado de cuenta."
      );
    } finally {
      setIsAnalyzing(false);
      if (uploadInputRef.current) uploadInputRef.current.value = "";
      if (addMoreInputRef.current) addMoreInputRef.current.value = "";
    }
  };

  const handleInitialUploadFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    processFiles(Array.from(fileList), "replace");
  };

  const handleAddMoreFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    processFiles(Array.from(fileList), "append");
  };

  const totalMonthlySavingsGTQ = report.executiveDecisions.reduce(
    (sum, item) =>
      enabledDecisionIds[item.id] ? sum + item.monthlySavingsGTQ : sum,
    0
  );
  const totalMonthlySavingsUSD = Number(
    (totalMonthlySavingsGTQ / GTQ_PER_USD).toFixed(0)
  );

  const bi = report.bimonetaryKpis;
  const projectedNextRegularGTQ = Math.max(
    0,
    Math.round(bi.regularConsolidatedGTQ - totalMonthlySavingsGTQ)
  );

  const isMultiMonth = report.statementCount >= 2;

  const shortCardName = useMemo(() => {
    const raw = report.latestStatement.cardAlias || "Banco Demo ·••• 4829";
    return raw.replace("MasterCard Black ", "").replace("Visa Infinite ", "").replace("••••", "·•••");
  }, [report.latestStatement.cardAlias]);

  const loadedMonthsPillText = useMemo(() => {
    if (report.statementCount === 1) {
      return `1 mes analizado: ${report.latestStatement.shortMonth} 2026`;
    }
    const firstM = report.activeStatements[0]?.shortMonth || "Jul";
    const lastM =
      report.activeStatements[report.activeStatements.length - 1]?.shortMonth ||
      "Sep";
    return `${report.statementCount} meses comparados: ${firstM} – ${lastM} 2026`;
  }, [report.statementCount, report.latestStatement, report.activeStatements]);

  // Data for Gráfica 1 ( Resumen ): Category Q vs $ Bar Chart
  const categoryChartData = useMemo(() => {
    return report.categories.slice(0, 7).map((cat) => ({
      name:
        cat.category.length > 18
          ? cat.category.split(" ")[0]
          : cat.category,
      fullName: cat.category,
      quetzalesGtq: Math.round(cat.currentMonthNativeGTQ),
      dolaresEnGtq: Math.round(cat.currentMonthNativeUSD * GTQ_PER_USD),
      nativeUsd: Number(cat.currentMonthNativeUSD.toFixed(2)),
      totalGtq: Math.round(cat.currentMonthGTQ),
    }));
  }, [report.categories]);

  // Data for Gráfica 2 ( Resumen ): Donut Chart (Consumo Q vs Consumo $ vs Cuotas Extrafinanciamiento)
  const compositionPieData = useMemo(() => {
    return report.bimonetaryComposition.map((b) => ({
      name: b.shortLabel,
      value: Math.round(b.equivalentGtq),
      nativeDisplay: b.nativeDisplay,
      sharePct: Number(b.shareOfTotalPct.toFixed(1)),
      color: b.color,
      txCount: b.txCount,
    }));
  }, [report.bimonetaryComposition]);

  // Data for Gráfica 3 ( Resumen ): Top 8 Merchants Horizontal Bar Chart
  const top8MerchantsChartData = useMemo(() => {
    return report.topMerchants.slice(0, 8).map((m) => {
      const shortName =
        m.merchant.length > 20 ? m.merchant.slice(0, 20) + "…" : m.merchant;
      return {
        label: `${shortName} (${m.visitCountCurrentMonth} ${
          m.visitCountCurrentMonth === 1 ? "cargo" : "cargos"
        })`,
        merchant: m.merchant,
        amountGTQ: Math.round(m.currentMonthGTQ),
        visits: m.visitCountCurrentMonth,
        nativeGtq: m.currentMonthNativeGTQ,
        nativeUsd: m.currentMonthNativeUSD,
      };
    });
  }, [report.topMerchants]);

  // Data for Tendencias Category Velocity Slopes
  const categoryVelocitySlopes = useMemo(() => {
    return report.categories.slice(0, 6).map((cat, idx) => {
      let deltaPct =
        report.statementCount >= 3
          ? cat.threeMonthGrowthPct
          : cat.monthOverMonthDeltaPct;

      if (deltaPct === null || deltaPct === undefined) {
        // Fallback single-month share indicator
        deltaPct = Math.round(cat.sharePercentage);
      }

      const firstVal = cat.monthlySeries[0]?.amountGTQ ?? cat.currentMonthGTQ;
      const lastVal =
        cat.monthlySeries[cat.monthlySeries.length - 1]?.amountGTQ ??
        cat.currentMonthGTQ;

      return {
        category: cat.category,
        shortCategory: cat.category.split(" ")[0],
        deltaPct: Math.round(deltaPct),
        firstVal: Math.round(firstVal),
        lastVal: Math.round(lastVal),
        color: cat.color,
        rank: idx + 1,
      };
    });
  }, [report.categories, report.statementCount]);

  // Data for Decisiones Before vs After Chart
  const decisionComparisonData = useMemo(() => {
    return [
      {
        name: "Corte Actual",
        montoGTQ: Math.round(bi.regularConsolidatedGTQ),
        fill: "#2d3142",
      },
      {
        name: "Próximo Corte (Con Decisiones)",
        montoGTQ: projectedNextRegularGTQ,
        fill: "#2563eb",
      },
    ];
  }, [bi.regularConsolidatedGTQ, projectedNextRegularGTQ]);

  // Filtered Transactions for Movimientos tab
  const filteredTransactions = useMemo(() => {
    const sourceStatements =
      selectedMonthKey === "all"
        ? report.activeStatements
        : report.activeStatements.filter((s) => s.monthKey === selectedMonthKey);

    const allTxs = sourceStatements.flatMap((st) =>
      st.transactions.map((tx) => ({
        ...tx,
        monthShort: st.shortMonth,
      }))
    );

    return allTxs
      .filter((tx) => {
        if (txFilter === "cuotas") return Boolean(tx.isExtrafinanciamiento);
        if (txFilter === "GTQ")
          return (
            !tx.isExtrafinanciamiento && (tx.originalCurrency ?? "GTQ") === "GTQ"
          );
        if (txFilter === "USD")
          return !tx.isExtrafinanciamiento && tx.originalCurrency === "USD";
        return true;
      })
      .filter((tx) => {
        if (!txSearch.trim()) return true;
        const q = txSearch.toLowerCase();
        return (
          tx.normalizedMerchant.toLowerCase().includes(q) ||
          tx.category.toLowerCase().includes(q) ||
          tx.rawDescriptor.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [report.activeStatements, selectedMonthKey, txFilter, txSearch]);

  // ============================================================================
  // HIGH-VISIBILITY LOADING OVERLAY / BANNER
  // ============================================================================
  const analyzingBanner = isAnalyzing ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl border border-blue-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Analizando {analyzingCount} estado
              {analyzingCount === 1 ? "" : "s"} de cuenta y calculando
              tendencias...
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Procesando categorías en Quetzales (Q), Dólares ($) y curvas
              multi-mes
            </p>
          </div>
        </div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-3/4 animate-pulse rounded-full bg-blue-600" />
        </div>
      </div>
    </div>
  ) : null;

  // ============================================================================
  // SCREEN 1: ULTRA-CLEAN UPLOAD SCREEN (ALMOST ZERO TEXT)
  // ============================================================================
  if (screen === "upload") {
    return (
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDraggingUpload(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDraggingUpload(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.currentTarget === e.target) {
            setIsDraggingUpload(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDraggingUpload(false);
          handleInitialUploadFiles(e.dataTransfer.files);
        }}
        className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col justify-center items-center px-6 py-12"
      >
        {analyzingBanner}

        <input
          ref={uploadInputRef}
          type="file"
          accept=".pdf,.csv,.txt,application/pdf,text/csv"
          multiple
          onChange={(e) => handleInitialUploadFiles(e.target.files)}
          className="hidden"
        />

        <div className="w-full max-w-xl text-center">
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs">
            <CreditCard className="h-5 w-5" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Análisis de Estados de Cuenta
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Arrastra uno o varios estados de cuenta en PDF para visualizar tus
            gastos, tendencias y decisiones.
          </p>

          {/* Interactive Drag & Drop Zone */}
          <div
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingUpload(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingUpload(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingUpload(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDraggingUpload(false);
              handleInitialUploadFiles(e.dataTransfer.files);
            }}
            onClick={() => uploadInputRef.current?.click()}
            className={`mt-7 cursor-pointer rounded-2xl border-2 border-dashed p-10 sm:p-12 transition-all bg-white shadow-xs ${
              isDraggingUpload
                ? "border-blue-600 bg-blue-50/70 scale-[1.01]"
                : "border-slate-300 hover:border-blue-500 hover:bg-slate-50/60"
            }`}
          >
            <div className="flex flex-col items-center">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl transition ${
                  isDraggingUpload
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                <Upload className="h-6 w-6" />
              </div>

              <p className="mt-4 text-base font-semibold text-slate-900">
                {isDraggingUpload
                  ? "Suelta tus archivos PDF aquí"
                  : "Arrastra y suelta 1 o varios PDFs aquí"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                o haz clic para explorar archivos desde tu computadora
              </p>

              <span className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white">
                Seleccionar PDF(s)
              </span>
            </div>
          </div>

          {uploadError && (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {uploadError}
            </div>
          )}

          {/* 2 Small Demo Buttons */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => loadPresetAndOpenDashboard(1)}
              className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              Ver ejemplo de 1 mes
            </button>
            <button
              type="button"
              onClick={() => loadPresetAndOpenDashboard(3)}
              className="rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition cursor-pointer"
            >
              Ver ejemplo de 3 meses
            </button>
            {hasLoadedAny && (
              <button
                type="button"
                onClick={() => setScreen("dashboard")}
                className="rounded-lg border border-slate-300 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition cursor-pointer"
              >
                Volver al dashboard ({report.statementCount}M)
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // SCREEN 2: 4-TAB GRAPHICAL DASHBOARD
  // ============================================================================
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingDashboard(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handleAddMoreFiles(e.dataTransfer.files);
        }
      }}
      className="min-h-screen bg-[#f8fafc] text-slate-900"
    >
      {analyzingBanner}

      <input
        ref={addMoreInputRef}
        type="file"
        accept=".pdf,.csv,.txt,application/pdf,text/csv"
        multiple
        onChange={(e) => handleAddMoreFiles(e.target.files)}
        className="hidden"
      />

      {/* TOP BAR WITH CARD ALIAS, LOADED MONTHS PILL, DRAG-AND-DROP ADD BUTTON & 4 TABS */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xs">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3 py-3">
            {/* Left: Card Name + Loaded Months Pill */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setScreen("upload")}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition cursor-pointer"
                title="Volver a pantalla de carga"
              >
                <CreditCard className="h-4 w-4" />
              </button>

              <span className="text-sm font-bold tracking-tight text-slate-900">
                {shortCardName}
              </span>

              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  isMultiMonth
                    ? "bg-blue-100 text-blue-800"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {loadedMonthsPillText}
              </span>
            </div>

            {/* Right: Drag-and-Drop Enabled Button to Add More PDFs */}
            <div className="flex items-center gap-2">
              {report.statementCount === 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    loadPresetAndOpenDashboard(3);
                    setActiveTab("tendencias");
                  }}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
                  <span>Probar 3 meses</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => loadPresetAndOpenDashboard(1)}
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  <span>Ver 1 mes</span>
                </button>
              )}

              <div
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingDashboard(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingDashboard(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingDashboard(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingDashboard(false);
                  handleAddMoreFiles(e.dataTransfer.files);
                }}
                onClick={() => addMoreInputRef.current?.click()}
                className={`inline-flex items-center gap-1.5 rounded-lg border-2 border-dashed px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  isDraggingDashboard
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-blue-500/60 bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Arrastrar o agregar más PDFs</span>
              </div>
            </div>
          </div>

          {/* 4 Page Navigation Tabs */}
          <nav className="flex items-center gap-1 overflow-x-auto border-t border-slate-100 pt-1">
            <button
              type="button"
              onClick={() => setActiveTab("graficas")}
              className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === "graficas"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Resumen y Gráficas</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("tendencias")}
              className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === "tendencias"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Tendencias ({report.statementCount}M)</span>
              {isMultiMonth && (
                <span className="rounded-full bg-blue-100 px-1.5 py-0.2 text-[10px] font-bold text-blue-700">
                  Activa
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("decisiones")}
              className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === "decisiones"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Decisiones</span>
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-bold text-emerald-800">
                -{formatNativeCurrency(totalMonthlySavingsGTQ, "GTQ", 0)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("movimientos")}
              className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                activeTab === "movimientos"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <ListFilter className="h-3.5 w-3.5" />
              <span>Movimientos</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* ====================================================================
            TAB 1: RESUMEN Y GRÁFICAS (3 KPIs + 3 LARGE VISUAL CHARTS)
           ==================================================================== */}
        {activeTab === "graficas" && (
          <div className="space-y-6">
            {/* 3 Clean KPI Numbers */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* KPI 1: Compras en Quetzales (Q) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    Compras del mes en Quetzales (Q)
                  </span>
                  {isMultiMonth && bi.momDeltaGTQPct !== null && (
                    <span
                      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        bi.momDeltaGTQPct > 0
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {bi.momDeltaGTQPct > 0 ? "+" : ""}
                      {bi.momDeltaGTQPct.toFixed(0)}% vs mes ant.
                    </span>
                  )}
                </div>
                <div className="mt-2 text-3xl font-bold tracking-tight tabular-nums text-slate-900">
                  {formatNativeCurrency(bi.regularPurchasesGTQ, "GTQ")}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {bi.regularPurchasesTxCountGTQ} cargos en moneda local
                </div>
              </div>

              {/* KPI 2: Compras en Dólares ($) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    Compras del mes en Dólares ($)
                  </span>
                  {isMultiMonth && bi.momDeltaUSDPct !== null && (
                    <span
                      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        bi.momDeltaUSDPct > 0
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {bi.momDeltaUSDPct > 0 ? "+" : ""}
                      {bi.momDeltaUSDPct.toFixed(0)}% vs mes ant.
                    </span>
                  )}
                </div>
                <div className="mt-2 text-3xl font-bold tracking-tight tabular-nums text-blue-600">
                  {formatNativeCurrency(bi.regularPurchasesUSD, "USD")}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {bi.regularPurchasesTxCountUSD} cargos internacionales /
                  digitales
                </div>
              </div>

              {/* KPI 3: Cuotas / Extrafinanciamiento (Q) */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">
                    Cuotas / Extrafinanciamiento (Q)
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                    {bi.extrafinanciamientoTxCount} cuotas
                  </span>
                </div>
                <div className="mt-2 text-3xl font-bold tracking-tight tabular-nums text-slate-900">
                  {formatNativeCurrency(bi.extrafinanciamientoGTQ, "GTQ")}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Separado del consumo regular del mes
                </div>
              </div>
            </div>

            {/* Row of Gráfica 1 (Bar Chart Categorías Q vs $) & Gráfica 2 (Donut Proporción) */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Gráfica 1: Gasto por Categoría (Quetzales Q vs Dólares $) */}
              <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Gasto por Categoría (Quetzales Q vs Dólares $)
                    </h2>
                    <p className="text-xs text-slate-500">
                      Comparativa visual por rubro en el corte{" "}
                      {report.latestStatement.monthLabel}
                    </p>
                  </div>
                </div>

                <div className="mt-5 h-[290px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={categoryChartData}
                      margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#e2e8f0"
                      />
                      <XAxis
                        dataKey="name"
                        axisLine={{ stroke: "#cbd5e1" }}
                        tickLine={false}
                        tick={{ fill: "#475569", fontSize: 11 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#475569", fontSize: 11 }}
                        tickFormatter={(v: number) =>
                          `Q${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`
                        }
                      />
                      <Tooltip
                        formatter={(val: number, name: string) => [
                          `Q${val.toLocaleString("es-GT")}`,
                          name,
                        ]}
                        labelFormatter={(_, payload) =>
                          payload?.[0]?.payload?.fullName || ""
                        }
                        contentStyle={{
                          borderRadius: "10px",
                          borderColor: "#cbd5e1",
                          fontSize: "12px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Bar
                        dataKey="quetzalesGtq"
                        stackId="cat"
                        name="Quetzales (Q)"
                        fill="#1e293b"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="dolaresEnGtq"
                        stackId="cat"
                        name="Dólares ($ equiv. Q)"
                        fill="#2563eb"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfica 2: Donut Chart — Proporción Consumo Regular vs Cuotas de Extrafinanciamiento */}
              <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs flex flex-col justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Consumo Regular vs. Extrafinanciamiento
                  </h2>
                  <p className="text-xs text-slate-500">
                    Proporción del estado de cuenta total
                  </p>

                  <div className="mt-4 h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={compositionPieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={82}
                          paddingAngle={3}
                        >
                          {compositionPieData.map((entry, idx) => (
                            <Cell
                              key={idx}
                              fill={
                                idx === 0
                                  ? "#1e293b"
                                  : idx === 1
                                  ? "#2563eb"
                                  : "#94a3b8"
                              }
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(val: number) => [
                            `Q${val.toLocaleString("es-GT")}`,
                            "Equivalente GTQ",
                          ]}
                          contentStyle={{
                            borderRadius: "10px",
                            borderColor: "#cbd5e1",
                            fontSize: "12px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="space-y-2 border-t border-slate-100 pt-3">
                  {compositionPieData.map((item, idx) => {
                    const dotColor =
                      idx === 0
                        ? "#1e293b"
                        : idx === 1
                        ? "#2563eb"
                        : "#94a3b8";
                    return (
                      <div
                        key={item.name}
                        className="flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: dotColor }}
                          />
                          <span className="font-medium text-slate-700">
                            {item.name}
                          </span>
                        </div>
                        <div className="font-mono font-semibold text-slate-900 tabular-nums">
                          {item.nativeDisplay}{" "}
                          <span className="text-slate-400 font-normal">
                            ({item.sharePct}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Gráfica 3: Top 8 Comercios con Mayor Consumo y Número de Cargos */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Top 8 Comercios por Volumen y Número de Cargos
                  </h2>
                  <p className="text-xs text-slate-500">
                    Comercios con mayor impacto en tu estado de cuenta
                  </p>
                </div>
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  Azul = Cobro en USD ($) · Oscuro = Cobro en GTQ (Q)
                </span>
              </div>

              <div className="mt-5 h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={top8MerchantsChartData}
                    margin={{ top: 4, right: 24, left: 12, bottom: 4 }}
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
                      tick={{ fill: "#475569", fontSize: 11 }}
                      tickFormatter={(v: number) =>
                        `Q${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`
                      }
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={235}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#0f172a", fontSize: 11, fontWeight: 500 }}
                    />
                    <Tooltip
                      formatter={(val: number) => [
                        `Q${val.toLocaleString("es-GT")}`,
                        "Consumo total",
                      ]}
                      contentStyle={{
                        borderRadius: "10px",
                        borderColor: "#cbd5e1",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="amountGTQ" radius={[0, 6, 6, 0]}>
                      {top8MerchantsChartData.map((entry, idx) => (
                        <Cell
                          key={idx}
                          fill={entry.nativeUsd > 0 ? "#2563eb" : "#1e293b"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            TAB 2: TENDENCIAS (1 A 3+ MESES) (MULTI-MONTH EVOLUTION & VELOCITY)
           ==================================================================== */}
        {activeTab === "tendencias" && (
          <div className="space-y-6">
            {/* Drag-and-Drop Bar at the Top of Tendencias Tab */}
            <div
              onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingDashboard(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingDashboard(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingDashboard(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDraggingDashboard(false);
                handleAddMoreFiles(e.dataTransfer.files);
              }}
              onClick={() => addMoreInputRef.current?.click()}
              className={`rounded-2xl border-2 border-dashed p-4 sm:px-6 transition cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                isDraggingDashboard
                  ? "border-blue-600 bg-blue-50/90"
                  : "border-blue-400/70 bg-white hover:bg-blue-50/40"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Upload className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {report.statementCount === 1
                      ? "Arrastra 1 o 2 estados de cuenta adicionales aquí para desbloquear la evolución multi-mes"
                      : `Comparando ${report.statementCount} meses (${report.activeStatements
                          .map((s) => s.shortMonth)
                          .join(" → ")}) · Arrastra más PDFs aquí para ampliar la serie`}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Puedes soltar uno o varios archivos PDF directamente sobre
                    esta barra
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {report.statementCount === 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      loadPresetAndOpenDashboard(3);
                    }}
                    className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                  >
                    Cargar ejemplo 3 meses
                  </button>
                )}
                <span className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white">
                  + Agregar PDF(s)
                </span>
              </div>
            </div>

            {/* Month-over-Month Delta Summary Badges when 2+ months are loaded */}
            {isMultiMonth && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-slate-500">
                      Variación Mensual Total
                    </span>
                    <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
                      {report.kpis.monthOverMonthDeltaPct !== null
                        ? `${
                            report.kpis.monthOverMonthDeltaPct > 0 ? "+" : ""
                          }${report.kpis.monthOverMonthDeltaPct.toFixed(1)}%`
                        : "+18.4%"}
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    vs mes anterior
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-slate-500">
                      Promedio Mensual ({report.statementCount}M)
                    </span>
                    <div className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
                      {formatNativeCurrency(
                        report.kpis.threeMonthAverageGTQ,
                        "GTQ",
                        0
                      )}
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                    Consolidado Q + $
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-slate-500">
                      Mayor Aceleración
                    </span>
                    <div className="mt-1 text-base font-bold text-slate-900 truncate">
                      {categoryVelocitySlopes[0]?.category || "Transporte"}
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800">
                    +{ Math.abs(categoryVelocitySlopes[0]?.deltaPct ?? 24) }%
                  </span>
                </div>
              </div>
            )}

            {/* Gráfica Principal de Evolución Multi-Mes + Proyección a 90 Días */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      {isMultiMonth
                        ? `Evolución Multi-Mes (${report.activeStatements
                            .map((s) => s.shortMonth)
                            .join(" → ")}) y Proyección a 90 Días`
                        : "Velocidad Semanal del Mes e Inercia Proyectada"}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {isMultiMonth
                        ? "Trayectoria histórica real en Quetzales y Dólares + proyección de los próximos 3 cortes"
                        : "Ritmo semanal de gasto en el corte actual (sube otro PDF para ver evolución mes a mes)"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {isMultiMonth ? (
                      <ComposedChart
                        data={report.multiMonthEvolutionSeries}
                        margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
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
                          tick={{ fill: "#475569", fontSize: 11 }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#475569", fontSize: 11 }}
                          tickFormatter={(v: number) =>
                            `Q${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`
                          }
                        />
                        <Tooltip
                          formatter={(val: number, name: string) => [
                            `Q${val.toLocaleString("es-GT")}`,
                            name,
                          ]}
                          labelFormatter={(_, payload) =>
                            payload?.[0]?.payload?.label || ""
                          }
                          contentStyle={{
                            borderRadius: "10px",
                            borderColor: "#cbd5e1",
                            fontSize: "12px",
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: "12px" }} />
                        <Bar
                          dataKey="gtqRegular"
                          stackId="m"
                          name="Compras Q"
                          fill="#1e293b"
                        />
                        <Bar
                          dataKey="usdRegularInGtq"
                          stackId="m"
                          name="Compras $ (en Q)"
                          fill="#2563eb"
                          radius={[4, 4, 0, 0]}
                        />
                        <Line
                          type="monotone"
                          dataKey="trendLineGtq"
                          name="Curva de Tendencia + Proyección 90d"
                          stroke="#f97316"
                          strokeWidth={2.5}
                          dot={{ r: 4, fill: "#f97316" }}
                        />
                      </ComposedChart>
                    ) : (
                      <ComposedChart
                        data={report.weeklyVelocitySeries}
                        margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
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
                          tick={{ fill: "#475569", fontSize: 11 }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#475569", fontSize: 11 }}
                          tickFormatter={(v: number) =>
                            `Q${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`
                          }
                        />
                        <Tooltip
                          formatter={(val: number, name: string) => [
                            `Q${val.toLocaleString("es-GT")}`,
                            name,
                          ]}
                          contentStyle={{
                            borderRadius: "10px",
                            borderColor: "#cbd5e1",
                            fontSize: "12px",
                          }}
                        />
                        <Legend wrapperStyle={{ fontSize: "12px" }} />
                        <Bar
                          dataKey="gtqRegular"
                          stackId="w"
                          name="Compras Q"
                          fill="#1e293b"
                        />
                        <Bar
                          dataKey="usdRegularInGtq"
                          stackId="w"
                          name="Compras $ (en Q)"
                          fill="#2563eb"
                          radius={[4, 4, 0, 0]}
                        />
                        <Line
                          type="monotone"
                          dataKey="projectedInertiaGtq"
                          name="Inercia Semanal"
                          stroke="#f97316"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                        />
                      </ComposedChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Gráfica de Velocidad por Categoría (Horizontal Delta Bars) */}
              <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs flex flex-col justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Velocidad por Categoría
                  </h2>
                  <p className="text-xs text-slate-500">
                    {isMultiMonth
                      ? "Cambio porcentual entre cortes mensuales"
                      : "Peso porcentual dentro del corte actual"}
                  </p>

                  <div className="mt-5 space-y-4">
                    {categoryVelocitySlopes.map((item) => {
                      const isPositive = item.deltaPct >= 0;
                      const barWidth = Math.min(
                        100,
                        Math.max(12, Math.abs(item.deltaPct) * 1.8)
                      );
                      return (
                        <div key={item.category} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-800 truncate">
                              {item.category}
                            </span>
                            <span
                              className={`inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 font-mono text-xs font-bold ${
                                isMultiMonth
                                  ? isPositive
                                    ? "bg-amber-100 text-amber-900"
                                    : "bg-emerald-100 text-emerald-800"
                                  : "bg-slate-100 text-slate-800"
                              }`}
                            >
                              {isMultiMonth ? (
                                <>
                                  {isPositive ? "+" : ""}
                                  {item.deltaPct}%
                                  {isPositive ? (
                                    <ArrowUpRight className="h-3 w-3" />
                                  ) : (
                                    <ArrowDownRight className="h-3 w-3" />
                                  )}
                                </>
                              ) : (
                                `${item.deltaPct}% del mes`
                              )}
                            </span>
                          </div>

                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${barWidth}%`,
                                backgroundColor: item.color,
                              }}
                            />
                          </div>

                          <p className="text-[11px] text-slate-500">
                            {isMultiMonth
                              ? `Pasó de Q${item.firstVal.toLocaleString(
                                  "es-GT"
                                )} a Q${item.lastVal.toLocaleString("es-GT")}`
                              : `Consumo actual: Q${item.lastVal.toLocaleString(
                                  "es-GT"
                                )}`}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Multi-Month Category Comparison Bar Chart when 2+ months are loaded */}
            {isMultiMonth && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
                <h2 className="text-base font-bold text-slate-900">
                  Comparativa Mes a Mes por Categoría (
                  {report.activeStatements.map((s) => s.shortMonth).join(" vs ")}
                  )
                </h2>
                <p className="text-xs text-slate-500">
                  Evolución directa de cada rubro entre los estados de cuenta
                  cargados
                </p>

                <div className="mt-5 h-[270px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={report.categories.slice(0, 6).map((cat) => {
                        const row: Record<string, string | number> = {
                          category: cat.category.split(" ")[0],
                          fullCategory: cat.category,
                        };
                        cat.monthlySeries.forEach((ms, i) => {
                          row[`m${i}`] = Math.round(ms.amountGTQ);
                        });
                        return row;
                      })}
                      margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
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
                        tick={{ fill: "#475569", fontSize: 11 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "#475569", fontSize: 11 }}
                        tickFormatter={(v: number) =>
                          `Q${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`
                        }
                      />
                      <Tooltip
                        formatter={(val: number, name: string) => [
                          `Q${val.toLocaleString("es-GT")}`,
                          name,
                        ]}
                        contentStyle={{
                          borderRadius: "10px",
                          borderColor: "#cbd5e1",
                          fontSize: "12px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      {report.activeStatements.map((st, idx) => {
                        const palette = [
                          "#94a3b8",
                          "#475569",
                          "#2563eb",
                          "#0f172a",
                        ];
                        return (
                          <Bar
                            key={st.id}
                            dataKey={`m${idx}`}
                            name={st.shortMonth}
                            fill={palette[idx % palette.length]}
                            radius={[4, 4, 0, 0]}
                          />
                        );
                      })}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
            TAB 3: DECISIONES (VISUAL & PUNCHY — 70% LESS TEXT)
           ==================================================================== */}
        {activeTab === "decisiones" && (
          <div className="space-y-6">
            {/* Top Visual Bar: Impacto en tu próximo estado de cuenta (Before vs After Bar Chart) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
                <div className="lg:col-span-5 space-y-3">
                  <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                    Ahorro potencial: {formatNativeCurrency(totalMonthlySavingsGTQ, "GTQ", 0)} / mes ($
                    {totalMonthlySavingsUSD} USD)
                  </span>
                  <h2 className="text-lg font-bold text-slate-900">
                    Impacto en tu próximo estado de cuenta
                  </h2>
                  <p className="text-xs text-slate-500">
                    Activa o desactiva decisiones para simular cuánto baja tu
                    próximo corte mensual.
                  </p>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="rounded-xl bg-slate-50 p-3 border border-slate-200">
                      <span className="text-[11px] text-slate-500 block">
                        Consumo Actual
                      </span>
                      <span className="text-lg font-bold text-slate-900 tabular-nums">
                        {formatNativeCurrency(bi.regularConsolidatedGTQ, "GTQ", 0)}
                      </span>
                    </div>
                    <div className="rounded-xl bg-blue-50 p-3 border border-blue-200">
                      <span className="text-[11px] text-blue-700 block">
                        Nuevo Corte Meta
                      </span>
                      <span className="text-lg font-bold text-blue-700 tabular-nums">
                        {formatNativeCurrency(projectedNextRegularGTQ, "GTQ", 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Before vs After Horizontal Bar Chart */}
                <div className="lg:col-span-7 h-[150px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={decisionComparisonData}
                      margin={{ top: 8, right: 24, left: 12, bottom: 8 }}
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
                        tick={{ fill: "#475569", fontSize: 11 }}
                        tickFormatter={(v: number) =>
                          `Q${(v / 1000).toFixed(0)}k`
                        }
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={195}
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: "#0f172a",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      />
                      <Tooltip
                        formatter={(val: number) => [
                          `Q${val.toLocaleString("es-GT")}`,
                          "Monto mensual",
                        ]}
                        contentStyle={{
                          borderRadius: "10px",
                          borderColor: "#cbd5e1",
                          fontSize: "12px",
                        }}
                      />
                      <Bar dataKey="montoGTQ" radius={[0, 8, 8, 0]} barSize={28}>
                        {decisionComparisonData.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* 4 Compact Decision Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {report.executiveDecisions.slice(0, 4).map((dec) => {
                const active = Boolean(enabledDecisionIds[dec.id]);
                const targetPct =
                  dec.currentSpendGTQ > 0
                    ? Math.max(
                        15,
                        Math.round(
                          (dec.targetSpendGTQ / dec.currentSpendGTQ) * 100
                        )
                      )
                    : 65;

                return (
                  <div
                    key={dec.id}
                    onClick={() =>
                      setEnabledDecisionIds((prev) => ({
                        ...prev,
                        [dec.id]: !prev[dec.id],
                      }))
                    }
                    className={`rounded-2xl border p-5 transition cursor-pointer flex flex-col justify-between ${
                      active
                        ? "border-blue-600 bg-white shadow-sm"
                        : "border-slate-200 bg-white/80 hover:border-slate-300"
                    }`}
                  >
                    <div>
                      {/* Top Row: Savings Badge + Toggle Switch */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 font-mono text-xs font-bold text-emerald-900">
                          Ahorro:{" "}
                          {formatNativeCurrency(dec.monthlySavingsGTQ, "GTQ", 0)}{" "}
                          / mes (${dec.monthlySavingsUSD.toFixed(0)})
                        </span>

                        <button
                          type="button"
                          role="switch"
                          aria-checked={active}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
                            active
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {active && <Check className="h-3.5 w-3.5" />}
                          <span>{active ? "Aplicada" : "Aplicar decisión"}</span>
                        </button>
                      </div>

                      {/* Short Title (max 6 words) */}
                      <h3 className="mt-3.5 text-base font-bold text-slate-900">
                        {dec.shortTitle}
                      </h3>

                      {/* 1 Single Short Action Sentence (max 18 words) */}
                      <p className="mt-1 text-xs text-slate-600">
                        {dec.shortAction}
                      </p>
                    </div>

                    {/* Mini Comparative Bar (Actual vs Meta) */}
                    <div className="mt-5 space-y-2 border-t border-slate-100 pt-3">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-500">
                          Actual:{" "}
                          <strong className="text-slate-800">
                            Q{dec.currentSpendGTQ.toLocaleString("es-GT")}
                          </strong>
                        </span>
                        <span className="text-blue-600">
                          Meta:{" "}
                          <strong>
                            Q{dec.targetSpendGTQ.toLocaleString("es-GT")}
                          </strong>
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="h-2 w-full rounded-full bg-slate-200" />
                        <div
                          className="h-2 rounded-full bg-blue-600 transition-all"
                          style={{ width: `${targetPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ====================================================================
            TAB 4: MOVIMIENTOS (CLEAN FILTERABLE TRANSACTION TABLE)
           ==================================================================== */}
        {activeTab === "movimientos" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: "all", label: "Todos" },
                    { id: "GTQ", label: "Quetzales Q" },
                    { id: "USD", label: "Dólares $" },
                    { id: "cuotas", label: "Cuotas" },
                  ] as { id: CurrencyFilter; label: string }[]
                ).map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setTxFilter(pill.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                      txFilter === pill.id
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}

                {isMultiMonth && (
                  <select
                    value={selectedMonthKey}
                    onChange={(e) => setSelectedMonthKey(e.target.value)}
                    className="ml-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700"
                  >
                    <option value="all">
                      Todos los meses ({report.statementCount})
                    </option>
                    {report.activeStatements.map((s) => (
                      <option key={s.monthKey} value={s.monthKey}>
                        {s.monthLabel}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Search Input */}
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={txSearch}
                  onChange={(e) => setTxSearch(e.target.value)}
                  placeholder="Buscar comercio o categoría..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase text-slate-500">
                    <th className="py-2.5 pr-3">Fecha</th>
                    <th className="py-2.5 pr-3">Comercio</th>
                    <th className="py-2.5 pr-3">Categoría</th>
                    <th className="py-2.5 text-right">Moneda Original</th>
                    <th className="py-2.5 text-right">Equivalente Q</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.map((tx) => {
                    const isUsd = tx.originalCurrency === "USD";
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 pr-3 font-mono text-slate-500 whitespace-nowrap">
                          {tx.date}
                        </td>
                        <td className="py-2.5 pr-3 font-semibold text-slate-900">
                          {tx.normalizedMerchant}
                        </td>
                        <td className="py-2.5 pr-3 text-slate-600">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px]">
                            {tx.category}
                          </span>
                        </td>
                        <td
                          className={`py-2.5 text-right font-mono font-bold tabular-nums ${
                            isUsd ? "text-blue-600" : "text-slate-900"
                          }`}
                        >
                          {formatNativeCurrency(
                            tx.originalAmount ?? tx.amountGTQ,
                            tx.originalCurrency ?? "GTQ"
                          )}
                        </td>
                        <td className="py-2.5 text-right font-mono text-slate-600 tabular-nums">
                          {formatNativeCurrency(tx.amountGTQ, "GTQ")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
