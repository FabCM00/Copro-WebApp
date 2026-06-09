"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import type { SolicitudUI, SolicitudEstado } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  RefreshCw,
  Download,
  Inbox,
  Maximize2,
  PanelLeftClose,
  PanelLeft,
  SlidersHorizontal,
  X,
  CheckCircle2,
  MoreVertical,
} from "lucide-react";
import { RequestDetail } from "./RequestDetail";
import { RequestDetailModal } from "./RequestDetailModal";
import { ModalTabs, type DetailModalTab } from "./ModalHeader";
import { BandejaFiltros, type FiltroTab } from "./BandejaFiltros";

type Mode = "admin" | "user";

interface BandejaViewProps {
  mode: Mode;
  cedulaFilter?: string;
}

const ESTADO_LABEL: Record<SolicitudEstado, string> = {
  aprobado: "Aprobado",
  preaprobado: "Preaprobado",
  en_revision: "En revisión",
  pendiente: "Pendiente",
  rechazado: "Rechazado",
  no_viable: "No viable",
};

const ESTADO_DOT: Record<SolicitudEstado, string> = {
  aprobado: "bg-green-500",
  preaprobado: "bg-blue-500",
  en_revision: "bg-amber-500",
  pendiente: "bg-gray-400",
  rechazado: "bg-red-500",
  no_viable: "bg-orange-500",
};

const ESTADO_BADGE: Record<SolicitudEstado, string> = {
  aprobado: "bg-green-50 text-green-700",
  preaprobado: "bg-blue-50 text-blue-700",
  en_revision: "bg-amber-50 text-amber-700",
  pendiente: "bg-gray-100 text-gray-600",
  rechazado: "bg-red-50 text-red-700",
  no_viable: "bg-orange-50 text-orange-700",
};

export function BandejaView({ mode, cedulaFilter }: BandejaViewProps) {
  const [solicitudes, setSolicitudes] = useState<SolicitudUI[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [filtro, setFiltro] = useState<FiltroTab>("todos");
  const [selectedRadicado, setSelectedRadicado] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<SolicitudUI | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<DetailModalTab>("campos");
  const [page, setPage] = useState(1);
  const [vistaGestionados, setVistaGestionados] = useState(false);
  const [confirmRadicado, setConfirmRadicado] = useState<string | null>(null);
  const [gestionando, setGestionando] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [filtroOpen, setFiltroOpen] = useState(false);
  const [showList, setShowList] = useState(true);
  const [accionesOpen, setAccionesOpen] = useState(false);
  const accionesRef = useRef<HTMLDivElement>(null);

  // Cierra el menú de acciones al hacer clic afuera
  useEffect(() => {
    if (!accionesOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        accionesRef.current &&
        !accionesRef.current.contains(e.target as Node)
      )
        setAccionesOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [accionesOpen]);

  const filtrosActivos = filtro !== "todos" ? 1 : 0;

  const limpiarFiltros = () => {
    setFiltro("todos");
  };

  const PAGE_SIZE = 20;

  const fetchData = useCallback(
    async (clearSelection = false) => {
      const prefix = process.env.NEXT_PUBLIC_URL_PREFIX || "";
      const url = `${prefix}/api/usuario/bandeja?limit=200${cedulaFilter ? `&cedulaFilter=${cedulaFilter}` : ""}`;
      try {
        const res = await fetch(url);
        const r = await res.json();
        if (!res.ok || !r.ok) {
          setError(r.message || "Error al cargar solicitudes");
          setSolicitudes([]);
          return;
        }
        setError(null);
        setSolicitudes(r.data);
        if (clearSelection) {
          setSelectedRadicado(null);
        } else {
          setSelectedRadicado((cur) => {
            if (cur && r.data.some((s: any) => s.radicado === cur)) return cur;
            return null;
          });
        }
      } catch (err: any) {
        setError(err?.message || "Error de red al cargar solicitudes");
        setSolicitudes([]);
      }
    },
    [cedulaFilter],
  );

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  // Carga el detalle completo (incluye `raw` con los JSON) al seleccionar
  useEffect(() => {
    if (!selectedRadicado) {
      setSelectedDetail(null);
      return;
    }
    let cancelled = false;
    const prefix = process.env.NEXT_PUBLIC_URL_PREFIX || "";
    fetch(
      `${prefix}/api/usuario/bandeja/${encodeURIComponent(selectedRadicado)}`,
    )
      .then((res) => res.json())
      .then((r) => {
        if (cancelled) return;
        if (r.ok && r.data) setSelectedDetail(r.data as SolicitudUI);
      })
      .catch(() => {
        /* el error de listado ya cubre la UI */
      });
    return () => {
      cancelled = true;
    };
  }, [selectedRadicado]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleGestionar = (radicado: string) => setConfirmRadicado(radicado);

  const handleConfirmGestionar = async () => {
    if (!confirmRadicado) return;
    setGestionando(true);
    try {
      const prefix = process.env.NEXT_PUBLIC_URL_PREFIX || "";
      const res = await fetch(`${prefix}/api/usuario/bandeja`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ radicado: confirmRadicado }),
      });
      const r = await res.json();
      setGestionando(false);
      setConfirmRadicado(null);
      if (!res.ok || !r.ok) {
        setError(`Error al gestionar: ${r.message || "Error de red"}`);
        return;
      }
      await fetchData(true);
    } catch (err: any) {
      setGestionando(false);
      setConfirmRadicado(null);
      setError(`Error al gestionar: ${err.message || "Error de red"}`);
    }
  };

  const totalActivas = useMemo(
    () => solicitudes.filter((s) => !s.gestionado).length,
    [solicitudes],
  );
  const totalGestionadas = useMemo(
    () => solicitudes.filter((s) => s.gestionado).length,
    [solicitudes],
  );

  const filtradas = useMemo(() => {
    let out = solicitudes.filter((s) =>
      vistaGestionados ? s.gestionado : !s.gestionado,
    );
    if (filtro !== "todos") out = out.filter((s) => s.estado === filtro);
    if (query.trim()) {
      const q = query.toLowerCase();
      out = out.filter(
        (s) =>
          s.cedula.toLowerCase().includes(q) ||
          s.solicitante.toLowerCase().includes(q) ||
          s.radicado.toLowerCase().includes(q),
      );
    }
    return out;
  }, [solicitudes, filtro, query, vistaGestionados]);

  const conteoPorEstado = useMemo(() => {
    const base = solicitudes.filter((s) =>
      vistaGestionados ? s.gestionado : !s.gestionado,
    );
    const map = new Map<FiltroTab, number>();
    map.set("todos", base.length);
    for (const s of base) map.set(s.estado, (map.get(s.estado) ?? 0) + 1);
    return map;
  }, [solicitudes, vistaGestionados]);

  const totalPages = Math.max(1, Math.ceil(filtradas.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageRows = filtradas.slice(pageStart, pageStart + PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [filtro, query, solicitudes, vistaGestionados]);
  useEffect(() => {
    setSelectedRadicado(null);
    setModalOpen(false);
  }, [vistaGestionados]);

  const seleccionada = useMemo(
    () => solicitudes.find((s) => s.radicado === selectedRadicado) ?? null,
    [solicitudes, selectedRadicado],
  );

  // Detalle a mostrar: el detalle cargado (con `raw`) si corresponde al
  // radicado seleccionado; mientras carga, no hay nada que renderizar aún.
  const detalle =
    selectedDetail && selectedDetail.radicado === selectedRadicado
      ? selectedDetail
      : null;

  const handleExportCSV = () => {
    if (filtradas.length === 0) return;
    const headers = [
      "identificacion",
      "fecha",
      "radicado",
      "solicitante",
      "valor",
      "estado",
      "score_cifin",
      "gestionado",
    ];
    const csv = [
      headers.join(","),
      ...filtradas.map((s) =>
        [
          s.cedula,
          s.fecha,
          s.radicado,
          `"${s.solicitante.replace(/"/g, '""')}"`,
          s.valor,
          ESTADO_LABEL[s.estado],
          s.score ?? "",
          s.gestionado ? (s.gestionadoAt ?? "sí") : "no",
        ].join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bandeja_${vistaGestionados ? "gestionadas_" : ""}${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const confirmSolicitud = confirmRadicado
    ? solicitudes.find((s) => s.radicado === confirmRadicado)
    : null;

  return (
    <div className="flex flex-col -m-4 sm:-m-6 lg:-m-8 h-[calc(100%+2rem)] sm:h-[calc(100%+3rem)] lg:h-[calc(100%+4rem)]">
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3 border-b border-[#0D0D0D]/10 bg-white flex-shrink-0">
        <div>
          <h2 className="text-sm font-bold text-[#012340]">
            {mode === "admin" ? "Bandeja de solicitudes" : "Mis solicitudes"}
          </h2>
          <p className="text-[11px] text-[#0D0D0D]/40">
            {loading
              ? "Cargando…"
              : `${solicitudes.length} solicitudes cargadas`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Acción principal — solo cuando hay una solicitud seleccionable */}
          {seleccionada && !seleccionada.gestionado && (
            <Button
              onClick={() => handleGestionar(seleccionada.radicado)}
              className="rounded-md bg-[#012340] hover:bg-[#012340]/90 text-white h-7 px-2.5 text-[10px] font-semibold tracking-wide shadow-sm"
            >
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Marcar como Gestionado
            </Button>
          )}

          {/* Menú de acciones secundarias */}
          <div className="relative" ref={accionesRef}>
            <button
              onClick={() => setAccionesOpen((o) => !o)}
              title="Acciones"
              className={`flex items-center justify-center h-7 w-7 rounded-md border transition-colors ${
                accionesOpen
                  ? "border-[#012340] bg-[#012340] text-white"
                  : "border-[#0D0D0D]/12 text-[#0D0D0D]/55 hover:border-[#012340]/40 hover:text-[#012340]"
              }`}
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>

            {accionesOpen && (
              <div className="absolute right-0 top-full mt-1.5 z-30 w-48 bg-white border border-[#0D0D0D]/12 rounded-md shadow-lg overflow-hidden py-1 animate-in fade-in slide-in-from-top-1 duration-150">
                {/* Acción de la solicitud seleccionada */}
                {seleccionada && (
                  <>
                    <button
                      onClick={() => {
                        setModalOpen(true);
                        setAccionesOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[12px] font-medium text-[#0D0D0D]/70 hover:bg-[#012340] hover:text-white transition-colors"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                      Expandir
                    </button>
                    <div className="my-1 h-px bg-[#0D0D0D]/8" />
                  </>
                )}
                <button
                  onClick={() => {
                    handleRefresh();
                    setAccionesOpen(false);
                  }}
                  disabled={refreshing}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[12px] font-medium text-[#0D0D0D]/70 hover:bg-[#012340] hover:text-white transition-colors disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
                  />
                  Actualizar
                </button>
                <button
                  onClick={() => {
                    handleExportCSV();
                    setAccionesOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[12px] font-medium text-[#0D0D0D]/70 hover:bg-[#012340] hover:text-white transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Exportar CSV
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="flex-shrink-0 border-b border-red-200 bg-red-50 px-6 py-2 text-xs text-red-700 flex items-center gap-2">
          <span className="font-semibold">Error:</span> {error}
        </div>
      )}

      {/* ── Shared control row: toggle (left) + tabs (right) ── */}
      <div className="flex items-stretch border-b border-[#0D0D0D]/10 bg-white flex-shrink-0">
        {showList && (
          <div className="w-[340px] flex-shrink-0 flex border-r border-[#0D0D0D]/10 transition-all">
            <button
              onClick={() => setVistaGestionados(false)}
              className={`flex-1 py-2.5 text-[11px] font-semibold tracking-wide transition-all ${!vistaGestionados ? "bg-[#012340] text-white" : "text-[#0D0D0D]/50 hover:text-[#0D0D0D]/80"}`}
            >
              Activas{" "}
              <span
                className={`ml-1 text-[10px] font-bold ${!vistaGestionados ? "opacity-70" : "opacity-40"}`}
              >
                {totalActivas}
              </span>
            </button>
            <div className="w-px bg-[#0D0D0D]/10" />
            <button
              onClick={() => setVistaGestionados(true)}
              className={`flex-1 py-2.5 text-[11px] font-semibold tracking-wide transition-all ${vistaGestionados ? "bg-[#012340] text-white" : "text-[#0D0D0D]/50 hover:text-[#0D0D0D]/80"}`}
            >
              Gestionadas{" "}
              <span
                className={`ml-1 text-[10px] font-bold ${vistaGestionados ? "opacity-70" : "opacity-40"}`}
              >
                {totalGestionadas}
              </span>
            </button>
          </div>
        )}
        <div className="flex-1 flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowList(!showList)}
              className="p-1.5 text-[#0D0D0D]/40 hover:text-[#012340] hover:bg-[#0D0D0D]/5 rounded-md transition-colors"
              title={showList ? "Ocultar lista" : "Mostrar lista"}
            >
              {showList ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeft className="h-4 w-4" />
              )}
            </button>
            {seleccionada && (
              <ModalTabs active={activeTab} onChange={setActiveTab} />
            )}
          </div>
        </div>
      </div>

      {/* ── Two-panel body ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden bg-white">
        {/* ── Panel de Filtros empotrado (al lado de la lista) ── */}
        <BandejaFiltros
          open={filtroOpen}
          filtro={filtro}
          conteoPorEstado={conteoPorEstado}
          filtrosActivos={filtrosActivos}
          onFiltroChange={setFiltro}
          onLimpiar={limpiarFiltros}
          onClose={() => setFiltroOpen(false)}
        />

        {/* ── Left: search + filters + list ── */}
        {showList && (
          <div className="w-[340px] flex-shrink-0 flex flex-col border-r border-[#0D0D0D]/10 bg-white overflow-hidden transition-all">
            <div className="flex-shrink-0 px-3 py-2.5 border-b border-[#0D0D0D]/8">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#0D0D0D]/30" />
                  <Input
                    placeholder="Buscar solicitudes…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="rounded-none border-[#0D0D0D]/12 pl-8 h-8 text-xs focus-visible:ring-0 focus-visible:border-[#012340]/40 bg-[#0D0D0D]/[0.02]"
                  />
                </div>
                <button
                  onClick={() => setFiltroOpen((o) => !o)}
                  title="Filtros"
                  className={`relative flex-shrink-0 h-8 w-8 flex items-center justify-center border transition-colors ${
                    filtroOpen || filtrosActivos > 0
                      ? "border-[#012340] bg-[#012340] text-white"
                      : "border-[#0D0D0D]/12 text-[#0D0D0D]/55 hover:border-[#012340]/40 hover:text-[#012340]"
                  }`}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  {filtrosActivos > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 h-3.5 min-w-3.5 px-0.5 flex items-center justify-center rounded-full bg-[#F29A2E] text-white text-[9px] font-bold leading-none">
                      {filtrosActivos}
                    </span>
                  )}
                </button>
              </div>

              {/* Chips de filtros activos */}
              {filtrosActivos > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {filtro !== "todos" && (
                    <FilterChip
                      label={ESTADO_LABEL[filtro as SolicitudEstado]}
                      onRemove={() => setFiltro("todos")}
                    />
                  )}
                  <button
                    onClick={limpiarFiltros}
                    className="text-[10px] font-semibold text-[#0D0D0D]/40 hover:text-[#012340] transition-colors underline underline-offset-2"
                  >
                    Limpiar
                  </button>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-[#0D0D0D]/10">
              {loading ? (
                <div className="flex flex-col">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="px-4 py-3 border-b border-[#0D0D0D]/5 animate-pulse"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <div className="h-1.5 w-1.5 rounded-full bg-[#0D0D0D]/12 flex-shrink-0" />
                          <div
                            className="h-3 bg-[#0D0D0D]/8 rounded"
                            style={{ width: 120 }}
                          />
                        </div>
                        <div
                          className="h-2.5 bg-[#0D0D0D]/8 rounded"
                          style={{ width: 36 }}
                        />
                      </div>
                      <div
                        className="h-2 bg-[#0D0D0D]/6 rounded ml-3 mb-1.5"
                        style={{ width: 100 }}
                      />
                      <div className="flex items-center justify-between ml-3">
                        <div
                          className="h-2.5 bg-[#0D0D0D]/6 rounded"
                          style={{ width: 90 }}
                        />
                        <div
                          className="h-2.5 bg-[#0D0D0D]/6 rounded"
                          style={{ width: 48 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : pageRows.length === 0 ? (
                <div className="py-16 px-4 text-center flex flex-col items-center gap-3">
                  <Inbox className="h-6 w-6 text-[#0D0D0D]/20" />
                  <p className="text-sm font-semibold text-[#0D0D0D]/50">
                    Sin resultados
                  </p>
                  <p className="text-[11px] text-[#0D0D0D]/35">
                    Intenta con otro filtro o búsqueda
                  </p>
                </div>
              ) : (
                pageRows.map((s) => {
                  const selected = s.radicado === selectedRadicado;
                  return (
                    <button
                      key={s.radicado}
                      onClick={() =>
                        setSelectedRadicado(selected ? null : s.radicado)
                      }
                      className={`group w-full text-left px-4 py-3 border-b border-[#0D0D0D]/5 transition-colors border-l-2 ${
                        selected
                          ? "bg-[#012340]/[0.05] border-l-[#012340]"
                          : "border-l-transparent hover:bg-[#0D0D0D]/[0.02]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${ESTADO_DOT[s.estado]}`}
                          />
                          <span
                            className={`text-[13px] truncate ${!s.gestionado ? "font-semibold text-[#012340]" : "font-normal text-[#0D0D0D]/60"}`}
                          >
                            {s.solicitante}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#0D0D0D]/35 flex-shrink-0">
                          {formatFechaCorta(s.fecha)}
                        </span>
                      </div>
                      <p className="font-mono text-[10px] text-[#0D0D0D]/40 truncate pl-3 mb-1">
                        {s.radicado}
                      </p>
                      <div className="flex items-center justify-between gap-2 pl-3">
                        <span className="text-[11px] text-[#0D0D0D]/45 truncate">
                          CC {s.cedula} · {formatCurrency(s.valor)}
                        </span>
                        <span
                          className={`flex-shrink-0 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide border ${ESTADO_BADGE[s.estado]}`}
                        >
                          {ESTADO_LABEL[s.estado]}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {!loading && filtradas.length > PAGE_SIZE && (
              <div className="flex-shrink-0 border-t border-[#0D0D0D]/10 px-3 py-2 flex items-center justify-between">
                <span className="text-[10px] text-[#0D0D0D]/40">
                  {pageStart + 1}–
                  {Math.min(pageStart + PAGE_SIZE, filtradas.length)} de{" "}
                  {filtradas.length}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    className="h-6 w-6 flex items-center justify-center border border-[#0D0D0D]/12 text-[#0D0D0D]/50 hover:border-[#012340] hover:text-[#012340] disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                    className="h-6 w-6 flex items-center justify-center border border-[#0D0D0D]/12 text-[#0D0D0D]/50 hover:border-[#012340] hover:text-[#012340] disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                  >
                    ›
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Right: detail ── */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {seleccionada ? (
            detalle ? (
              <RequestDetail
                solicitud={detalle}
                activeTab={activeTab}
                onGestionar={
                  mode === "admin" && !detalle.gestionado
                    ? () => handleGestionar(detalle.radicado)
                    : undefined
                }
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-[#0D0D0D]/25">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <p className="text-sm font-medium">Cargando detalle…</p>
              </div>
            )
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-[#0D0D0D]/25">
              <Inbox className="h-10 w-10" />
              <p className="text-sm font-medium">Selecciona una solicitud</p>
            </div>
          )}
        </div>
      </div>

      {modalOpen && detalle && (
        <RequestDetailModal
          solicitud={detalle}
          initialTab={activeTab}
          onClose={() => setModalOpen(false)}
          onGestionar={
            !detalle.gestionado
              ? () => handleGestionar(detalle.radicado)
              : undefined
          }
        />
      )}

      {confirmRadicado && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !gestionando)
              setConfirmRadicado(null);
          }}
        >
          <div className="w-full max-w-sm bg-white border border-[#0D0D0D]/15 shadow-2xl">
            <div className="border-b border-[#0D0D0D]/10 px-5 py-4">
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#0D0D0D]/40">
                Confirmar acción
              </p>
              <h3 className="mt-1 text-sm font-bold text-[#012340]">
                Marcar como Gestionado
              </h3>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-sm text-[#0D0D0D]/70">
                ¿Confirmas que esta solicitud ya fue atendida?
              </p>
              {confirmSolicitud && (
                <div className="border border-[#0D0D0D]/10 bg-[#0D0D0D]/[0.02] p-3 space-y-1">
                  <p className="text-xs">
                    <span className="font-medium text-[#0D0D0D]/45">
                      Solicitante:
                    </span>{" "}
                    <span className="text-[#0D0D0D]/80">
                      {confirmSolicitud.solicitante}
                    </span>
                  </p>
                  <p className="text-xs">
                    <span className="font-medium text-[#0D0D0D]/45">
                      Cédula:
                    </span>{" "}
                    <span className="text-[#0D0D0D]/80">
                      {confirmSolicitud.cedula}
                    </span>
                  </p>
                  <p className="text-xs">
                    <span className="font-medium text-[#0D0D0D]/45">
                      Radicado:
                    </span>{" "}
                    <span className="font-mono text-[#0D0D0D]/80">
                      {confirmSolicitud.radicado}
                    </span>
                  </p>
                </div>
              )}
              <p className="text-xs text-[#0D0D0D]/40">
                La solicitud pasará a Gestionadas. Esta acción no se puede
                deshacer.
              </p>
            </div>
            <div className="border-t border-[#0D0D0D]/10 px-5 py-3 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setConfirmRadicado(null)}
                disabled={gestionando}
                className="rounded-none border-[#0D0D0D]/15 h-8 px-4 text-[11px] font-semibold"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmGestionar}
                disabled={gestionando}
                className="rounded-none bg-[#012340] hover:bg-[#012340]/90 text-white h-8 px-4 text-[11px] font-semibold"
              >
                {gestionando ? "Guardando…" : "Confirmar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 bg-[#012340]/[0.07] text-[#012340] text-[10px] font-semibold rounded">
      {label}
      <button
        onClick={onRemove}
        className="hover:bg-[#012340]/15 rounded p-0.5 transition-colors"
        title="Quitar filtro"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}

function formatCurrency(v: number): string {
  if (!Number.isFinite(v)) return "$0";
  return "$" + new Intl.NumberFormat("es-CO").format(Math.round(v));
}

function formatFechaCorta(iso: string): string {
  if (!iso) return "—";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  const meses = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ];
  return `${parseInt(m[3])} ${meses[parseInt(m[2]) - 1]}`;
}
