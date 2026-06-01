"use client";

import React, { useState, useMemo, type ReactNode } from "react";
import Editor from "@monaco-editor/react";
import { type SolicitudDetail } from "@/lib/bandeja";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Database,
  Cpu,
  ShieldCheck,
  FileJson,
  ClipboardList,
  ChevronDown,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// ─── Helpers de formato ───────────────────────────────────────────────────────

function fmtMoneda(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "string" ? parseFloat(v.replace(/[^0-9.-]/g, "")) : v;
  if (!Number.isFinite(n)) return String(v);
  if (n > 999)
    return "$" + new Intl.NumberFormat("es-CO").format(Math.round(n));
  return String(v);
}

function fmtVal(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

function fmtPct(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return (v * 100).toFixed(2) + "%";
}

function fmtTasa(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  return (v * 100).toFixed(4) + "% M.V.";
}

function calcAntigüedadMeses(fecha: string | null | undefined): string {
  if (!fecha) return "—";
  const start = new Date(fecha);
  if (isNaN(start.getTime())) return "—";
  const meses = Math.floor(
    (Date.now() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.44),
  );
  if (meses < 12) return `${meses} mes${meses !== 1 ? "es" : ""}`;
  const años = Math.floor(meses / 12);
  const restMeses = meses % 12;
  return restMeses > 0
    ? `${años} año${años !== 1 ? "s" : ""} ${restMeses} m`
    : `${años} año${años !== 1 ? "s" : ""}`;
}

// ─── Componentes de sección ───────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#0D0D0D]/35 mb-2 px-1">
        {title}
      </p>
      <div className="border border-[#0D0D0D]/8 divide-y divide-[#0D0D0D]/6 bg-white">
        {children}
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string | number | null | undefined;
  mono?: boolean;
  highlight?: boolean;
}) {
  if (value === null || value === undefined || value === "" || value === "—")
    return null;
  return (
    <div className="flex items-center justify-between gap-6 px-4 py-2.5">
      <span className="text-xs text-[#0D0D0D]/45 flex-shrink-0">{label}</span>
      <span
        className={`text-xs text-right break-all leading-relaxed ${
          highlight
            ? "font-bold text-[#012340]"
            : mono
              ? "font-mono text-[#0D0D0D]/65"
              : "font-medium text-[#0D0D0D]/80"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function CriterioRow({ label, value }: { label: string; value: 1 | 2 | null }) {
  if (value === 1)
    return (
      <div className="flex items-center justify-between gap-4 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
          <span className="text-xs text-[#0D0D0D]/60">{label}</span>
        </div>
        <span className="text-[11px] font-semibold text-green-600">Cumple</span>
      </div>
    );

  if (value === 2)
    return (
      <div className="flex items-center justify-between gap-4 px-4 py-2.5 bg-red-50/60">
        <div className="flex items-center gap-2.5">
          <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
          <span className="text-xs text-[#0D0D0D]/60">{label}</span>
        </div>
        <span className="text-[11px] font-semibold text-red-600">
          No cumple
        </span>
      </div>
    );

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
      <div className="flex items-center gap-2.5">
        <MinusCircle className="h-4 w-4 text-[#0D0D0D]/20 flex-shrink-0" />
        <span className="text-xs text-[#0D0D0D]/40">{label}</span>
      </div>
      <span className="text-[11px] text-[#0D0D0D]/25">—</span>
    </div>
  );
}

function normBool(v: number | null | undefined): 1 | 2 | null {
  if (v === 1) return 1;
  if (v === 0) return 2;
  return null;
}

function norm(v: number | null | undefined): 1 | 2 | null {
  if (v === 1) return 1;
  if (v === 2) return 2;
  return null;
}

function CriteriaSummary({ values }: { values: (1 | 2 | null)[] }) {
  const defined = values.filter((v) => v !== null);
  const cumple = defined.filter((v) => v === 1).length;
  const total = defined.length;
  if (total === 0) return null;
  const pct = Math.round((cumple / total) * 100);
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-[#0D0D0D]/[0.02] border-b border-[#0D0D0D]/6">
      <div className="flex-1 h-1.5 bg-[#0D0D0D]/8 overflow-hidden">
        <div
          className={`h-full transition-all ${pct === 100 ? "bg-green-500" : pct >= 60 ? "bg-amber-400" : "bg-red-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] font-semibold text-[#0D0D0D]/50 flex-shrink-0">
        {cumple}/{total} cumplen
      </span>
    </div>
  );
}

// ─── Resumen principal ────────────────────────────────────────────────────────

export function ResumenSolicitud({
  solicitud,
}: {
  solicitud: SolicitudDetail;
}) {
  const v1 = solicitud.raw.valida1;
  const mp = solicitud.raw.motor_process;
  const md = solicitud.raw.motor_data;
  const iv = solicitud.raw.identity;

  // Extraer datos del JSONB
  const v1resp = v1.response_json;
  const v1req = v1.request_json;
  const mdDatos = md?.response_json?.datos_asociado;
  const proc = mp?.response_json?.processing;
  const oferta = mp?.response_json?.oferta;

  // Contacto: motor_data tiene datos más completos que valida1
  const celular = mdDatos?.celular ?? v1req?.celular;
  const email = mdDatos?.email ?? v1req?.email;

  // Solvencia y métricas de capacidad
  const ingresoTotal =
    (mdDatos?.salarioBase ?? 0) + (mdDatos?.otroSalario ?? 0);
  const egresoTotal = proc?.egresoTotal;

  // Datos de identidad del request (request y response son iguales en este motor)
  const ivData = iv?.request_json ?? iv?.response_json;

  // Motivos de rechazo de valida1
  const detallesRechazo = v1resp?.detalles_rechazo ?? [];

  return (
    <div className="p-4 flex flex-col gap-5">
      {/* Alerta sin motor */}
      {solicitud.sinMotor && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 px-3 py-3 text-xs text-amber-800">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-500" />
          <span>
            Solicitud sin resultado de motor. Solo se muestran datos de la
            validación inicial.
          </span>
        </div>
      )}

      {/* ── Solicitante ──────────────────────────────────────── */}
      <Section title="Solicitante">
        <InfoRow label="Nombre" value={solicitud.solicitante} highlight />
        <InfoRow label="Cédula" value={solicitud.cedula} mono />
        {proc?.edad != null && (
          <InfoRow label="Edad" value={`${proc.edad} años`} />
        )}
        {mdDatos?.fechaEficacia && (
          <InfoRow
            label="Antigüedad Eficacia"
            value={
              proc?.antEficacia != null
                ? `${proc.antEficacia} año${proc.antEficacia !== 1 ? "s" : ""}`
                : calcAntigüedadMeses(mdDatos.fechaEficacia)
            }
          />
        )}
        {mdDatos?.fechaFondex && (
          <InfoRow
            label="Antigüedad Fondo"
            value={
              proc?.antFondexYear != null
                ? `${proc.antFondexYear} año${proc.antFondexYear !== 1 ? "s" : ""}`
                : calcAntigüedadMeses(mdDatos.fechaFondex)
            }
          />
        )}
        <InfoRow label="Celular" value={celular} mono />
        <InfoRow label="Email" value={email} mono />
        <InfoRow label="Estado laboral" value={mdDatos?.estadoEficacia} />
        <InfoRow label="Tipo contrato" value={mdDatos?.tipoContrato} />
        <InfoRow label="Sección" value={mdDatos?.seccionNombre} />
        <InfoRow label="Fecha solicitud" value={solicitud.fecha} />
      </Section>

      {/* ── Solicitud / Oferta ────────────────────────────────── */}
      <Section title="Solicitud">
        {oferta ? (
          <>
            <InfoRow label="Línea de crédito" value={oferta.linea} highlight />
            <InfoRow
              label="Monto aprobado"
              value={fmtMoneda(oferta.monto)}
              highlight
            />
            <InfoRow
              label="Plazo"
              value={oferta.plazo != null ? `${oferta.plazo} meses` : undefined}
            />
            <InfoRow
              label="Cuota mensual"
              value={fmtMoneda(oferta.cuota_mensual)}
            />
            <InfoRow
              label="Tasa mes vencida"
              value={fmtTasa(oferta.tasa_mes_vencida)}
            />
            <InfoRow
              label="Tasa efectiva anual"
              value={
                oferta.tasa_efectiva_anual != null
                  ? `${(oferta.tasa_efectiva_anual * 100).toFixed(2)}% E.A.`
                  : undefined
              }
            />
            <InfoRow label="Escenario" value={oferta.escenario} />
          </>
        ) : (
          <>
            <InfoRow
              label="Salario base"
              value={fmtMoneda(mdDatos?.salarioBase)}
            />
            <InfoRow label="Nómina" value={mdDatos?.seccionNombre} />
          </>
        )}
      </Section>

      {/* ── Análisis financiero ───────────────────────────────── */}
      {(proc || mdDatos) && (
        <Section title="Análisis financiero">
          {ingresoTotal > 0 && (
            <InfoRow label="Ingresos totales" value={fmtMoneda(ingresoTotal)} />
          )}
          <InfoRow
            label="Salario base"
            value={fmtMoneda(mdDatos?.salarioBase)}
          />
          <InfoRow
            label="Otros ingresos"
            value={fmtMoneda(mdDatos?.otroSalario)}
          />
          <InfoRow label="Egresos totales" value={fmtMoneda(egresoTotal)} />
          <InfoRow label="Egreso familiar" value={fmtMoneda(proc?.egresoFam)} />
          <InfoRow label="Prestaciones" value={fmtMoneda(proc?.prestaciones)} />
          {proc?.solvencia != null && (
            <InfoRow label="Solvencia" value={proc.solvencia.toFixed(4)} />
          )}
          {proc?.capacPagoDisp != null && (
            <InfoRow
              label="Capacidad de pago disponible"
              value={fmtPct(proc.capacPagoDisp)}
            />
          )}
          <InfoRow label="Cupo máximo" value={fmtMoneda(proc?.cupoMax)} />
          <InfoRow
            label="Disponible (cuota)"
            value={fmtMoneda(proc?.disponibleDesp)}
          />
          <InfoRow
            label="Créditos vigentes (saldo)"
            value={fmtMoneda(mdDatos?.creditosVigentes)}
          />
          <InfoRow
            label="Aportes sociales"
            value={fmtMoneda(mdDatos?.aportes)}
          />
          <InfoRow label="Seg. Social" value={fmtMoneda(mdDatos?.segSocial)} />
          <InfoRow
            label="Descuentos fondo"
            value={fmtMoneda(mdDatos?.descuentosFondo)}
          />
        </Section>
      )}

      {/* ── Score Fondex ─────────────────────────────────────── */}
      {proc && (
        <Section title="Scoring Fondex">
          <InfoRow
            label="Score total"
            value={proc.scoreFondex?.toFixed(2)}
            highlight
          />
          <InfoRow label="Perfil" value={proc.perfilFondex} highlight />
          <InfoRow label="Pts. Edad" value={fmtVal(proc.puntosEdad)} />
          <InfoRow label="Pts. Salario" value={fmtVal(proc.puntoSalario)} />
          <InfoRow label="Pts. Fondex" value={fmtVal(proc.puntosFondex)} />
          <InfoRow label="Pts. Créditos" value={fmtVal(proc.puntosCreditos)} />
          <InfoRow label="Pts. Eficacia" value={fmtVal(proc.puntosEficacia)} />
          <InfoRow label="Pts. Captación" value={fmtVal(proc.puntosCapta)} />
          <InfoRow label="Pts. Contrato" value={fmtVal(proc.puntosCoontrato)} />
        </Section>
      )}

      {/* ── Valida 1 — Criterios iniciales ───────────────────── */}
      <Section title="Valida 1 — Criterios del cliente">
        <CriteriaSummary
          values={[
            norm(v1resp?.motor1),
            norm(v1resp?.valida_id),
            norm(v1resp?.valida_email),
            norm(v1resp?.valida_celular),
            norm(v1resp?.valida_estado_laboral),
          ]}
        />
        <CriterioRow
          label="Resultado Validación 1"
          value={norm(v1resp?.motor1)}
        />
        <CriterioRow
          label="Validación Identidad (ID)"
          value={norm(v1resp?.valida_id)}
        />
        <CriterioRow
          label="Validación Email"
          value={norm(v1resp?.valida_email)}
        />
        <CriterioRow
          label="Validación Celular"
          value={norm(v1resp?.valida_celular)}
        />
        <CriterioRow
          label="Validación Estado Laboral"
          value={norm(v1resp?.valida_estado_laboral)}
        />
      </Section>

      {/* ── Identidad — Validación documental y facial ───────── */}
      <Section title="Identidad — Validación documental y facial">
        {ivData ? (
          <>
            <CriteriaSummary
              values={[
                normBool(ivData.status_document),
                normBool(ivData.status_face),
              ]}
            />
            <CriterioRow
              label="Documento de identidad"
              value={normBool(ivData.status_document)}
            />
            <CriterioRow
              label="Validación facial (biometría)"
              value={normBool(ivData.status_face)}
            />
            <InfoRow
              label="Tipo de validación"
              value={
                ivData.tipo_validacion != null
                  ? `Tipo ${ivData.tipo_validacion}`
                  : undefined
              }
            />
          </>
        ) : (
          <p className="px-4 py-3 text-xs text-[#0D0D0D]/30 italic">
            Sin datos de validación de identidad.
          </p>
        )}
      </Section>

      {/* ── Motor de crédito — Viabilidad ────────────────────── */}
      <Section title="Motor de crédito — Viabilidad">
        {proc ? (
          <>
            <CriteriaSummary
              values={[
                normBool(proc.viabilidadDef),
                normBool(proc.viabilidad1),
              ]}
            />
            <CriterioRow
              label="Viabilidad definitiva"
              value={normBool(proc.viabilidadDef)}
            />
            <CriterioRow
              label="Viabilidad criterio 1"
              value={normBool(proc.viabilidad1)}
            />
            <InfoRow
              label="Plazo máximo"
              value={
                proc.plazoMax != null ? `${proc.plazoMax} meses` : undefined
              }
            />
            <InfoRow
              label="Mora máxima sector"
              value={fmtVal(proc.maxMoraSector)}
            />
          </>
        ) : (
          <p className="px-4 py-3 text-xs text-[#0D0D0D]/30 italic">
            No se ha procesado el motor para esta solicitud.
          </p>
        )}
      </Section>

      {/* ── Motivos de rechazo ────────────────────────────────── */}
      {(detallesRechazo.length > 0 ||
        (v1resp?.mensaje && v1resp.motor1 !== 1)) && (
        <Section title="Motivos no apto">
          {detallesRechazo.length > 0 ? (
            <div className="divide-y divide-[#0D0D0D]/6">
              {detallesRechazo.map((detalle: string, i: number) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 px-4 py-3 bg-red-50/60"
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 leading-relaxed">
                    {detalle}
                  </p>
                </div>
              ))}
            </div>
          ) : v1resp?.mensaje ? (
            <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 leading-relaxed">
                {v1resp.mensaje}
              </p>
            </div>
          ) : null}
        </Section>
      )}
    </div>
  );
}

// ─── Vista JSON — Monaco Editor ───────────────────────────────────────────────

export function JsonView({ data }: { data: unknown }) {
  const formatted = useMemo(() => {
    if (data === null || data === undefined) return "";
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return "";
    }
  }, [data]);

  if (!formatted)
    return (
      <div className="p-5 text-sm text-slate-400 italic">No hay datos.</div>
    );

  return (
    <div className="flex flex-col h-full bg-white">
      <style>{`
                .monaco-editor .find-widget.visible {
                    top: 30px !important;
                    right: 30px !important;
                }
            `}</style>
      <div className="flex-1 min-h-[300px] overflow-hidden">
        <Editor
          height="100%"
          language="json"
          value={formatted}
          theme="light"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 10,
            fontFamily: "Consolas, 'Courier New', monospace",
            wordWrap: "on",
            renderLineHighlight: "none",
            lineNumbersMinChars: 5,
            folding: true,
            padding: { top: 16, bottom: 16 },
            contextmenu: false,
          }}
          loading={
            <div className="p-4 text-xs text-slate-400 font-mono">
              Cargando editor...
            </div>
          }
        />
      </div>
    </div>
  );
}

// ─── Vista multi-panel del JSON completo ──────────────────────────────────────

type MotorJsonPanel =
  | "valida1"
  | "motor_data"
  | "motor_process"
  | "identity"
  | "auditoria";

const MOTOR_JSON_PANELS: {
  id: MotorJsonPanel;
  shortLabel: string;
  icon: React.ReactNode;
  hasReqRes: boolean;
}[] = [
  {
    id: "valida1",
    shortLabel: "Validación",
    icon: <ShieldCheck className="h-3.5 w-3.5" />,
    hasReqRes: true,
  },
  {
    id: "motor_data",
    shortLabel: "Motor Data",
    icon: <Database className="h-3.5 w-3.5" />,
    hasReqRes: true,
  },
  {
    id: "motor_process",
    shortLabel: "Motor Process",
    icon: <Cpu className="h-3.5 w-3.5" />,
    hasReqRes: true,
  },
  {
    id: "identity",
    shortLabel: "Identidad",
    icon: <FileJson className="h-3.5 w-3.5" />,
    hasReqRes: true,
  },
  {
    id: "auditoria",
    shortLabel: "Auditoría",
    icon: <ClipboardList className="h-3.5 w-3.5" />,
    hasReqRes: false,
  },
];

function buildAuditoriaResumen(
  solicitud: SolicitudDetail,
): Record<string, unknown> {
  const v1 = solicitud.raw.valida1;
  const mp = solicitud.raw.motor_process;
  const proc = mp?.response_json?.processing;
  return {
    meta: {
      generado_en: new Date().toISOString(),
      radicado: solicitud.radicado,
      cedula: solicitud.cedula,
      solicitante: solicitud.solicitante,
      fecha_solicitud: solicitud.fecha,
    },
    decision: {
      estado: solicitud.estado,
      decision_texto: solicitud.decisionTexto,
      motor2: mp?.response_json?.motor2 ?? null,
      sin_motor: solicitud.sinMotor,
      score_tu: solicitud.score,
    },
    oferta: mp?.response_json?.oferta ?? null,
    validaciones_iniciales: {
      motor1: v1.response_json?.motor1 ?? null,
      valida_id: v1.response_json?.valida_id ?? null,
      valida_email: v1.response_json?.valida_email ?? null,
      valida_celular: v1.response_json?.valida_celular ?? null,
      valida_last_name: v1.response_json?.valida_last_name ?? null,
      valida_capacidad: v1.response_json?.valida_capacidad ?? null,
      valida_estado_laboral: v1.response_json?.valida_estado_laboral ?? null,
      mensaje: v1.response_json?.mensaje ?? null,
      detalles_rechazo: v1.response_json?.detalles_rechazo ?? [],
    },
    motor_processing: proc
      ? {
          viabilidadDef: proc.viabilidadDef,
          viabilidad1: proc.viabilidad1,
          solvencia: proc.solvencia,
          capacPagoDisp: proc.capacPagoDisp,
          egresoTotal: proc.egresoTotal,
          scoreFondex: proc.scoreFondex,
          perfilFondex: proc.perfilFondex,
        }
      : null,
  };
}

type ReqResSide = "req" | "res";

export function MotorJsonView({
  solicitud,
}: {
  solicitud: SolicitudDetail;
  hideExpand?: boolean;
}) {
  const [activePanel, setActivePanel] =
    useState<MotorJsonPanel>("motor_process");
  const [panelSide, setPanelSide] = useState<Record<string, ReqResSide>>({});

  const getSide = (panelId: string): ReqResSide => panelSide[panelId] ?? "res";

  const getPanelData = (
    panel: MotorJsonPanel,
    side: ReqResSide = "res",
  ): unknown => {
    switch (panel) {
      case "valida1":
        return side === "req"
          ? solicitud.raw.valida1.request_json
          : solicitud.raw.valida1.response_json;
      case "motor_data":
        return side === "req"
          ? (solicitud.raw.motor_data?.request_json ?? null)
          : (solicitud.raw.motor_data?.response_json ?? null);
      case "motor_process":
        return side === "req"
          ? (solicitud.raw.motor_process?.request_json ?? null)
          : (solicitud.raw.motor_process?.response_json ?? null);
      case "identity":
        return side === "req"
          ? (solicitud.raw.identity?.request_json ?? null)
          : (solicitud.raw.identity?.response_json ?? null);
      case "auditoria":
        return buildAuditoriaResumen(solicitud);
    }
  };

  const currentSide = getSide(activePanel);
  const activeData = getPanelData(activePanel, currentSide);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 border-b border-slate-200 bg-slate-50 overflow-x-auto">
        <div className="flex min-w-max">
          {MOTOR_JSON_PANELS.map((panel) => {
            const isActive = activePanel === panel.id;
            const isAudit = panel.id === "auditoria";
            const side = getSide(panel.id);
            const hasData = getPanelData(panel.id, side) != null;

            // Tab sin req/res (Auditoría)
            if (!panel.hasReqRes) {
              return (
                <button
                  key={panel.id}
                  onClick={() => setActivePanel(panel.id as MotorJsonPanel)}
                  className={`relative flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-semibold whitespace-nowrap transition-colors border-r border-slate-200 last:border-r-0 ${
                    isActive
                      ? "bg-white text-[#012340]"
                      : "text-slate-400 hover:text-slate-600 hover:bg-white/70"
                  }`}
                >
                  <span className="flex-shrink-0 text-emerald-600 transition-colors">
                    {panel.icon}
                  </span>
                  <span>{panel.shortLabel}</span>
                  <span
                    className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${hasData ? "bg-emerald-500" : "bg-slate-200"}`}
                  />
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
                  )}
                </button>
              );
            }

            // Tab con req/res: todo el tab es el trigger del popover
            return (
              <Popover key={panel.id}>
                <PopoverTrigger asChild>
                  <button
                    onClick={() => setActivePanel(panel.id as MotorJsonPanel)}
                    className={`group relative flex items-center gap-1.5 pl-4 pr-2.5 py-2.5 text-[11px] font-semibold whitespace-nowrap transition-colors border-r border-slate-200 last:border-r-0 ${
                      isActive
                        ? "bg-white text-[#012340]"
                        : "text-slate-400 hover:text-slate-600 hover:bg-white/70"
                    }`}
                  >
                    <span
                      className={`flex-shrink-0 transition-colors ${isActive ? "text-[#012340]" : "text-slate-300"}`}
                    >
                      {panel.icon}
                    </span>
                    <span>{panel.shortLabel}</span>
                    {isActive && (
                      <span className="font-mono text-[9px] text-[#012340]/50 uppercase tracking-wider">
                        {side}
                      </span>
                    )}
                    {/* Punto en inactivo; chevron en activo con hover */}
                    <span className="relative flex-shrink-0 h-3.5 w-3.5 flex items-center justify-center">
                      {isActive ? (
                        <ChevronDown className="h-3 w-3 text-[#012340]/40" />
                      ) : (
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${hasData ? "bg-[#012340]/25" : "bg-slate-200"}`}
                        />
                      )}
                    </span>
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#012340]" />
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  side="bottom"
                  align="start"
                  sideOffset={4}
                  className="w-auto min-w-0 p-1 shadow-sm border-[#0D0D0D]/8 bg-white/95 backdrop-blur-sm"
                >
                  <div className="flex gap-0.5">
                    {(["req", "res"] as ReqResSide[]).map((s) => {
                      const isCurrent = side === s;
                      return (
                        <button
                          key={s}
                          onClick={() => {
                            setActivePanel(panel.id as MotorJsonPanel);
                            setPanelSide((prev) => ({
                              ...prev,
                              [panel.id]: s,
                            }));
                          }}
                          className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-sm transition-colors ${
                            isCurrent
                              ? "bg-[#012340]/8 text-[#012340]"
                              : "text-[#0D0D0D]/35 hover:text-[#012340]/60"
                          }`}
                        >
                          {s === "req" ? "Req" : "Res"}
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            );
          })}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] bg-white">
        {activeData == null ? (
          <div className="p-5">
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 px-4 py-4 text-sm text-amber-800">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <p className="text-xs mt-1">
                No existe un registro asociado a este radicado.
              </p>
            </div>
          </div>
        ) : (
          <JsonView data={activeData} />
        )}
      </div>
    </div>
  );
}
