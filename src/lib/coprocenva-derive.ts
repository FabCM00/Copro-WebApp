import type { SolicitudEstado } from "./types";

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

function asNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/[^0-9.\-]/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function asStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

export interface CoproResponses {
  v1Resp: Dict;
  v1Req: Dict;
  mdResp: Dict;
  mpResp: Dict;
  idResp: Dict;
  hasIdentity: boolean;
  hasMotorData: boolean;
  hasMotorProcess: boolean;
}

function detalladoWant(r: CoproResponses): Dict {
  const fromMd = asObj(dig(r.mdResp, "detallado_want"));
  if (Object.keys(fromMd).length) return fromMd;
  return asObj(dig(r.mpResp, "detallado_want"));
}

function datosAsociado(r: CoproResponses): Dict {
  const md = asObj(dig(r.mdResp, "datos_asociado"));
  if (Object.keys(md).length) return md;
  return asObj(dig(r.v1Resp, "datos_asociado"));
}

function experianBasic(r: CoproResponses): Dict {
  return asObj(
    dig(
      r.mdResp,
      "api_responses",
      "experian_hdcplus",
      "ReportHDCplus",
      "basicInformation",
    ),
  );
}

export function buildSolicitante(r: CoproResponses): string {
  const nomV1 = asStr(r.v1Resp.nom);
  const apeV1 = asStr(r.v1Resp.apellido);
  const joinedV1 = `${nomV1} ${apeV1}`.trim();
  if (joinedV1) return joinedV1;

  const da = datosAsociado(r);
  const nomDa = asStr(da.nombre);
  const apeDa = asStr(da.apellido);
  const joinedDa = `${nomDa} ${apeDa}`.trim();
  if (joinedDa) return joinedDa;
  const deudor = asStr(da.deudor);
  if (deudor) return deudor;

  const basic = experianBasic(r);
  const fullName = asStr(basic.fullName);
  if (fullName) return fullName;
  const names = asStr(basic.names);
  const fln = asStr(basic.firstLastName);
  const sln = asStr(basic.secondLastName);
  const joinedExp = `${names} ${fln} ${sln}`.trim();
  if (joinedExp) return joinedExp;

  return "—";
}

export function extractScore(r: CoproResponses): number | null {
  const det = detalladoWant(r);
  const expe = asNum(det.score_expe);
  const trans = asNum(det.score_trans);
  if (expe !== null && expe > 0) return expe;
  if (trans !== null && trans > 0) return trans;
  return null;
}

export function extractMonto(r: CoproResponses): number {
  const neto = asNum(r.mpResp.neto_final);
  if (neto !== null && neto > 0) return neto;

  const reqAmount = asNum(r.v1Resp.req_amount) ?? asNum(r.v1Req.req_amount);
  if (reqAmount !== null && reqAmount > 0) return reqAmount;

  const montoCredito = asNum(detalladoWant(r).monto_credito);
  if (montoCredito !== null && montoCredito > 0) return montoCredito;

  return 0;
}

export function deriveEstado(r: CoproResponses): SolicitudEstado {
  const valida1 = asNum(r.v1Resp.valida_1);

  if (!r.hasIdentity) {
    return valida1 === 1 ? "valida_1" : "no_valida_1";
  }

  if (!r.hasMotorData) {
    const sf = r.idResp.status_face;
    const sd = r.idResp.status_document;
    const tv = asNum(r.idResp.tipo_validacion);
    const faceOk = sf === 1 || asStr(sf).toLowerCase() === "success";
    const docOk  = sd === 1 || asStr(sd).toLowerCase() === "success";
    const faceFail = sf === 2 || asStr(sf).toLowerCase() === "failed";
    const docFail  = sd === 2 || asStr(sd).toLowerCase() === "failed";
    if (faceOk && ((tv === 1 && docOk) || tv === 2)) return "val_identidad";
    if (faceFail || docFail) return "no_val_identidad";
  }

  if (r.hasMotorProcess) {
    const st = asStr(r.mpResp.status).toLowerCase();
    if (st && st !== "ok") return "fallo_servicios";
  }

  const decNum = asNum(r.mpResp.decision_final_num);
  if (decNum === 2) return "no_viable";
  if (decNum === 1) return "aprobado";

  return "revision";
}

export function decisionTexto(r: CoproResponses): string {
  const decTxt = asStr(r.mpResp.decision_final);
  if (decTxt) return decTxt;

  const esApto = r.v1Resp.es_apto;
  if (esApto === false) return "No apto en validación inicial";
  if (esApto === true) return "Pendiente de motor";

  return "Pendiente de validación";
}

// El timestamp embebido en el radicado y `createdAt` están en UTC; se marca
// explícitamente con "Z" para que cualquier `new Date(...)` lo interprete
// como UTC en vez de como hora local del navegador/servidor.
export function parseFecha(radicado: string, fallback: string): string {
  const ts = radicado.split("_")[1] ?? "";
  if (ts.length >= 6 && !isNaN(Number(ts.slice(0, 6)))) {
    const fecha = `20${ts.slice(0, 2)}-${ts.slice(2, 4)}-${ts.slice(4, 6)}`;
    const hora = ts.length >= 12 ? `T${ts.slice(6, 8)}:${ts.slice(8, 10)}:${ts.slice(10, 12)}Z` : "";
    return `${fecha}${hora}`;
  }
  return fallback.slice(0, 19) + "Z";
}

function norm12(v: unknown): 1 | 2 | null {
  const n = asNum(v);
  if (n === 1) return 1;
  if (n === 2) return 2;
  if (n === 0) return 2;
  return null;
}

export function buildValidaciones(r: CoproResponses) {
  const v1 = r.v1Resp;
  const items: { label: string; key: string; estado: 1 | 2 | null }[] = [
    {
      label: "Apto (Validación 1)",
      key: "valida_1",
      estado: norm12(v1.valida_1),
    },
    {
      label: "Validación Identidad",
      key: "valida_id",
      estado: norm12(v1.valida_id),
    },
    {
      label: "Validación Edad",
      key: "valida_edad",
      estado: norm12(v1.valida_edad),
    },
    {
      label: "Validación Celular",
      key: "valida_celular",
      estado: norm12(v1.valida_celular),
    },
    {
      label: "Validación Mora 12m",
      key: "valida_mora_12m",
      estado: norm12(v1.valida_mora_12m),
    },
    {
      label: "Validación Ocupación",
      key: "valida_ocupacion",
      estado: norm12(v1.valida_ocupacion),
    },
    {
      label: "Validación Antigüedad",
      key: "valida_antiguedad",
      estado: norm12(v1.valida_antiguedad),
    },
  ];

  const mp = r.mpResp;
  if (Object.keys(mp).length) {
    items.push(
      {
        label: "Cumple Solvencia",
        key: "cumple_solvencia",
        estado: norm12(mp.cumple_solvencia),
      },
      {
        label: "Cumple Capacidad Pago",
        key: "cumple_capacidad_pago",
        estado: norm12(mp.cumple_capacidad_pago),
      },
    );
  }

  return items.filter((i) => i.estado !== null);
}

export function buildResponses(args: {
  v1Resp?: unknown;
  v1Req?: unknown;
  mdResp?: unknown;
  mpResp?: unknown;
  idResp?: unknown;
  hasIdentity?: boolean;
  hasMotorData?: boolean;
  hasMotorProcess?: boolean;
}): CoproResponses {
  return {
    v1Resp: asObj(args.v1Resp),
    v1Req: asObj(args.v1Req),
    mdResp: asObj(args.mdResp),
    mpResp: asObj(args.mpResp),
    idResp: asObj(args.idResp),
    hasIdentity: args.hasIdentity ?? args.idResp != null,
    hasMotorData: args.hasMotorData ?? args.mdResp != null,
    hasMotorProcess: args.hasMotorProcess ?? args.mpResp != null,
  };
}
