"use client";

import React, { useState, useMemo, type ReactNode } from "react";
import Editor from "@monaco-editor/react";
import { type SolicitudUI } from "@/lib/types";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Database,
  Cpu,
  ShieldCheck,
  FileJson,
  Send,
  ChevronDown,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";


type Dict = Record<string, unknown>;

function dig(obj: unknown, ...path: string[]): unknown {
  let cur: unknown = obj;
  for (const key of path) {
    if (cur === null || cur === undefined || typeof cur !== "object")
      return undefined;
    cur = (cur as Dict)[key];
  }
  return cur;
}

function asObj(v: unknown): Dict {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Dict) : {};
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/[^0-9.\-]/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function fmtMoneda(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "string" ? parseFloat(v.replace(/[^0-9.\-]/g, "")) : v;
  if (!Number.isFinite(n)) return String(v);
  if (Math.abs(n as number) > 999)
    return "$" + new Intl.NumberFormat("es-CO").format(Math.round(n as number));
  return String(v);
}

function fmtVal(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "string" && v.trim() === "") return "—";
  return String(v).trim();
}

function fmtFecha(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  const s = String(v);
  // AAAAMMDD → AAAA-MM-DD
  if (/^\d{8}$/.test(s))
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  // AAAA-MM-DD ya viene bien
  return s;
}


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
        className={`text-xs text-right break-all leading-relaxed ${highlight
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

function norm12(v: unknown): 1 | 2 | null {
  const n = num(v);
  if (n === 1) return 1;
  if (n === 2 || n === 0) return 2;
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

export function ResumenSolicitud({ solicitud }: { solicitud: SolicitudUI }) {
  const raw = solicitud.raw;
  if (!raw) {
    return (
      <div className="p-5 text-sm text-[#0D0D0D]/40 italic">
        Cargando detalle de la solicitud…
      </div>
    );
  }

  const v1Resp = asObj(raw.valida1?.response_json);
  const v1Req = asObj(raw.valida1?.request_json);
  const mdResp = asObj(raw.motor_data?.response_json);
  const mpResp = asObj(raw.motor_process?.response_json);
  const idResp = asObj(raw.identity?.response_json);
  const envResp = asObj(raw.coprocenva_envios?.response_json);

  const da = asObj(dig(mdResp, "datos_asociado"));
  const det = Object.keys(asObj(dig(mdResp, "detallado_want"))).length
    ? asObj(dig(mdResp, "detallado_want"))
    : asObj(dig(mpResp, "detallado_want"));

  const motivosNoApto = Array.isArray(v1Resp.motivos_no_apto)
    ? (v1Resp.motivos_no_apto as unknown[]).map(String).filter(Boolean)
    : [];

  const celular = fmtVal(
    (v1Resp.celular_chat as string) ??
    (v1Resp.celular_copro as string) ??
    (da.celular as string) ??
    (v1Req.celular as string),
  );
  const email = fmtVal((da.email as string) ?? (v1Req.email as string));

  return (
    <div className="p-4 flex flex-col gap-5">
      <Section title="Solicitante">
        <InfoRow label="Nombre" value={solicitud.solicitante} highlight />
        <InfoRow label="Cédula" value={solicitud.cedula} mono />
        <InfoRow
          label="Tipo identidad"
          value={fmtVal(v1Resp.tipoIden as string)}
        />
        <InfoRow
          label="Edad"
          value={
            v1Resp.edad_calculada != null
              ? `${v1Resp.edad_calculada} años`
              : undefined
          }
        />
        <InfoRow
          label="Fecha nacimiento"
          value={fmtFecha(v1Resp.fecha_nacimiento as string)}
        />
        <InfoRow label="Celular" value={celular} mono />
        <InfoRow label="Email" value={email} mono />
        <InfoRow
          label="Ocupación"
          value={fmtVal(v1Resp.ocupacion_copro_texto as string)}
        />
        <InfoRow
          label="Antigüedad"
          value={
            v1Resp.antiguedad_meses_calculada != null
              ? `${v1Resp.antiguedad_meses_calculada} meses`
              : undefined
          }
        />
        <InfoRow
          label="Fecha ingreso coop."
          value={fmtFecha(v1Resp.fecha_ingreso_coop as string)}
        />
        <InfoRow label="Fecha solicitud" value={solicitud.fecha} />
      </Section>

      <Section title="Solicitud">
        <InfoRow
          label="Monto solicitado"
          value={fmtMoneda(
            (v1Resp.req_amount as string) ?? (det.monto_credito as number),
          )}
          highlight
        />
        {Object.keys(mpResp).length > 0 && (
          <>
            <InfoRow
              label="Neto final"
              value={fmtMoneda(mpResp.neto_final as number)}
              highlight
            />
            <InfoRow
              label="Neto parcial"
              value={fmtMoneda(mpResp.neto_parcial as number)}
            />
            <InfoRow
              label="Plazo"
              value={
                mpResp.plazo_meses != null
                  ? `${mpResp.plazo_meses} meses`
                  : undefined
              }
            />
            <InfoRow
              label="Cuota (incluye seguro)"
              value={fmtVal(mpResp.cuota_incluye_el_seguro as string)}
            />
            <InfoRow
              label="Cuota estatutarios"
              value={fmtMoneda(mpResp.cuota_mensual_estatutarios as number)}
            />
            <InfoRow
              label="Tasa nominal M.V."
              value={fmtVal(mpResp.tasa_nominal_mes_vencido as string)}
            />
            <InfoRow
              label="Modalidad"
              value={fmtVal(mpResp.modalidad as number)}
            />
          </>
        )}
      </Section>

      {Object.keys(mpResp).length > 0 && (
        <Section title="Análisis del motor">
            <InfoRow
            label="Agencia de Desembolso"
            value={fmtVal(det.agencia_desembolso as string | number)}
          />
          <InfoRow
            label="Ingreso total"
            value={fmtMoneda(det.ingreso_total as number)}
          />
          <InfoRow
            label="Pasivos"
            value={fmtMoneda(mpResp.pasivos as number)}
          />
          <InfoRow
            label="Gastos familiares"
            value={fmtMoneda(mpResp.gastos_familiares as number)}
          />
          <InfoRow
            label="Capital en riesgo"
            value={fmtMoneda(mpResp.capital_riesgo as number)}
          />
          <InfoRow
            label="Descuentos no bancarios"
            value={fmtMoneda(mpResp.descuentos_no_bancarios as number)}
          />
          {mpResp.solvencia != null && (
            <InfoRow
              label="Solvencia"
              value={(num(mpResp.solvencia) ?? 0).toFixed(2)}
            />
          )}
          {mpResp.capacidad_de_pago != null && (
            <InfoRow
              label="Capacidad de pago"
              value={`${(num(mpResp.capacidad_de_pago) ?? 0).toFixed(2)}%`}
            />
          )}
          <InfoRow
            label="Endeudamiento Coprocenva"
            value={fmtMoneda(det.endeudamiento_coprocenva as number)}
          />
          <InfoRow
            label="Obligaciones financieras"
            value={fmtMoneda(det.obligaciones_financieras as number)}
          />
          <InfoRow
            label="Cuota externa Experian"
            value={fmtMoneda(det.cuota_externa_experian as number)}
          />
          <InfoRow
            label="Deuda externa Experian"
            value={fmtMoneda(det.deuda_externa_experian as number)}
          />
        </Section>
      )}

      {(det.score_expe != null || det.score_trans != null) && (
        <Section title="Scoring (Centrales de riesgo)">
          <InfoRow
            label="Score Experian"
            value={fmtVal(det.score_expe as string | number)}
            highlight
          />
          <InfoRow
            label="Score TransUnion"
            value={fmtVal(det.score_trans as string | number)}
          />
          <InfoRow
            label="Meses continuidad"
            value={fmtVal(det.meses_continuidad as number)}
          />
          <InfoRow
            label="Mora externa 12m"
            value={fmtVal(det.mora_ext_12m as string)}
          />
          <InfoRow label="Días mora" value={fmtVal(det.diasmora as number)} />
        </Section>
      )}

      <Section title="Valida 1 — Criterios del cliente">
        <CriteriaSummary
          values={[
            norm12(v1Resp.valida_1),
            norm12(v1Resp.valida_id),
            norm12(v1Resp.valida_edad),
            norm12(v1Resp.valida_celular),
            norm12(v1Resp.valida_mora_12m),
            norm12(v1Resp.valida_ocupacion),
            norm12(v1Resp.valida_antiguedad),
          ]}
        />
        <CriterioRow label="Apto (Valida 1)" value={norm12(v1Resp.valida_1)} />
        <CriterioRow
          label="Validación Identidad"
          value={norm12(v1Resp.valida_id)}
        />
        <CriterioRow
          label="Validación Edad"
          value={norm12(v1Resp.valida_edad)}
        />
        <CriterioRow
          label="Validación Celular"
          value={norm12(v1Resp.valida_celular)}
        />
        <CriterioRow
          label="Validación Mora 12m"
          value={norm12(v1Resp.valida_mora_12m)}
        />
        <CriterioRow
          label="Validación Ocupación"
          value={norm12(v1Resp.valida_ocupacion)}
        />
        <CriterioRow
          label="Validación Antigüedad"
          value={norm12(v1Resp.valida_antiguedad)}
        />
        <CriterioRow
          label="Validación Endeudamiento"
          value={norm12(v1Resp.valida_endeudamiento_global)}
        />
      </Section>

      <Section title="Identidad — Validación documental y facial">
        {Object.keys(idResp).length > 0 ? (
          <>
            <CriteriaSummary
              values={[
                norm12(idResp.status_document),
                norm12(idResp.status_face),
                norm12(idResp.estado_validacion),
              ]}
            />
            <CriterioRow
              label="Documento de identidad"
              value={norm12(idResp.status_document)}
            />
            <CriterioRow
              label="Validación facial (biometría)"
              value={norm12(idResp.status_face)}
            />
            <CriterioRow
              label="Estado validación"
              value={norm12(idResp.estado_validacion)}
            />
            <InfoRow
              label="Tipo de validación"
              value={
                idResp.tipo_validacion != null
                  ? `Tipo ${idResp.tipo_validacion}`
                  : undefined
              }
            />
            <InfoRow label="Mensaje" value={fmtVal(idResp.message as string)} />
          </>
        ) : (
          <p className="px-4 py-3 text-xs text-[#0D0D0D]/30 italic">
            Sin datos de validación de identidad.
          </p>
        )}
      </Section>

      <Section title="Motor de crédito — Política de crédito">
        {Object.keys(mpResp).length > 0 ? (
          <>
            <CriteriaSummary
              values={[
                norm12(mpResp.cumple_solvencia),
                norm12(mpResp.cumple_capacidad_pago),
                norm12(mpResp.cumple_continuidad),
                norm12(mpResp.cumple_mora_ext_12m),
                norm12(mpResp.cumple_ingreso_total),
                norm12(mpResp.cumple_score_minimo),
              ]}
            />
            <CriterioRow
              label="Cumple Solvencia"
              value={norm12(mpResp.cumple_solvencia)}
            />
            <CriterioRow
              label="Cumple Capacidad de Pago"
              value={norm12(mpResp.cumple_capacidad_pago)}
            />
            <CriterioRow
              label="Cumple Continuidad"
              value={norm12(mpResp.cumple_continuidad)}
            />
            <CriterioRow
              label="Cumple Mora Externa 12m"
              value={norm12(mpResp.cumple_mora_ext_12m)}
            />
            <CriterioRow
              label="Cumple Ingreso Total"
              value={norm12(mpResp.cumple_ingreso_total)}
            />
            <CriterioRow
              label="Cumple Score Mínimo"
              value={norm12(mpResp.cumple_score_minimo)}
            />
          </>
        ) : (
          <p className="px-4 py-3 text-xs text-[#0D0D0D]/30 italic">
            No se ha procesado el motor para esta solicitud.
          </p>
        )}
      </Section>

      <Section title="Envío a Coprocenva">
        {raw.coprocenva_envios ? (
          <>
            <div className="flex items-center justify-between gap-4 px-4 py-2.5">
              <span className="text-xs text-[#0D0D0D]/45">
                Estado del envío
              </span>
              {envResp.envio_ok === true ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-green-600">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Enviado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-red-600">
                  <XCircle className="h-3.5 w-3.5" /> Con error
                </span>
              )}
            </div>
            <InfoRow
              label="Status Coprocenva"
              value={fmtVal(envResp.status_coprocenva as number)}
            />
            {typeof envResp.error === "string" && envResp.error && (
              <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50/60">
                <AlertTriangle className="h-3.5 w-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-red-700 leading-relaxed break-all">
                  {envResp.error}
                </p>
              </div>
            )}
          </>
        ) : (
          <p className="px-4 py-3 text-xs text-[#0D0D0D]/30 italic">
            Sin registro de envío a Coprocenva.
          </p>
        )}
      </Section>

      {(motivosNoApto.length > 0 || v1Resp.es_apto === false) && (
        <Section title="Motivos no apto">
          {motivosNoApto.length > 0 ? (
            <div className="divide-y divide-[#0D0D0D]/6">
              {motivosNoApto.map((m, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 px-4 py-3 bg-red-50/60"
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 leading-relaxed">{m}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-4 py-3 text-xs text-[#0D0D0D]/30 italic">
              Sin motivos de rechazo registrados.
            </p>
          )}
        </Section>
      )}
    </div>
  );
}


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


type MotorJsonPanel =
  | "valida1"
  | "motor_data"
  | "motor_process"
  | "identity"
  | "coprocenva_envios";

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
      id: "coprocenva_envios",
      shortLabel: "Envío Coprocenva",
      icon: <Send className="h-3.5 w-3.5" />,
      hasReqRes: true,
    },
  ];

type ReqResSide = "req" | "res";

export function MotorJsonView({
  solicitud,
}: {
  solicitud: SolicitudUI;
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
    const raw = solicitud.raw;
    switch (panel) {
      case "valida1":
        return side === "req"
          ? (raw?.valida1?.request_json ?? null)
          : (raw?.valida1?.response_json ?? null);
      case "motor_data":
        return side === "req"
          ? (raw?.motor_data?.request_json ?? null)
          : (raw?.motor_data?.response_json ?? null);
      case "motor_process":
        return side === "req"
          ? (raw?.motor_process?.request_json ?? null)
          : (raw?.motor_process?.response_json ?? null);
      case "identity":
        return side === "req"
          ? (raw?.identity?.request_json ?? null)
          : (raw?.identity?.response_json ?? null);
      case "coprocenva_envios":
        return side === "req"
          ? (raw?.coprocenva_envios?.request_json ?? null)
          : (raw?.coprocenva_envios?.response_json ?? null);
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
            const side = getSide(panel.id);
            const hasData = getPanelData(panel.id, side) != null;

            // Tab sin req/res (Auditoría)
            if (!panel.hasReqRes) {
              return (
                <button
                  key={panel.id}
                  onClick={() => setActivePanel(panel.id)}
                  className={`relative flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-semibold whitespace-nowrap transition-colors border-r border-slate-200 last:border-r-0 ${isActive
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
                    onClick={() => setActivePanel(panel.id)}
                    className={`group relative flex items-center gap-1.5 pl-4 pr-2.5 py-2.5 text-[11px] font-semibold whitespace-nowrap transition-colors border-r border-slate-200 last:border-r-0 ${isActive
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
                            setActivePanel(panel.id);
                            setPanelSide((prev) => ({
                              ...prev,
                              [panel.id]: s,
                            }));
                          }}
                          className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-sm transition-colors ${isCurrent
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
