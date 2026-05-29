import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { prisma } from "@/lib/prisma";


function parseFecha(radicado: string, fallback: string): string {
  const ts = radicado.split("_")[1] ?? "";
  if (ts.length >= 6 && !isNaN(Number(ts.slice(0, 6)))) {
    return `20${ts.slice(4, 6)}-${ts.slice(2, 4)}-${ts.slice(0, 2)}`;
  }
  return fallback.slice(0, 10);
}

function buildSolicitante(v1Resp: Record<string, unknown>, mdResp: Record<string, unknown>): string {
  const asociadoMd = (mdResp?.datos_asociado ?? {}) as Record<string, unknown>;
  const asociadoV1 = (v1Resp?.datos_asociado ?? {}) as Record<string, unknown>;
  const nombre =
    (asociadoMd?.deudor as string) ||
    (asociadoV1?.nombre_completo as string) ||
    "";
  return nombre.trim() || "—";
}

function extractMonto(mdResp: Record<string, unknown>, motorResp: Record<string, unknown>): number {
  const oferta = (motorResp?.oferta ?? {}) as Record<string, unknown>;
  if (typeof oferta?.monto === "number" && Number.isFinite(oferta.monto)) return oferta.monto as number;
  const asociado = (mdResp?.datos_asociado ?? {}) as Record<string, unknown>;
  if (typeof asociado?.salarioBase === "number") return asociado.salarioBase as number;
  return 0;
}

function deriveEstado(v1Resp: Record<string, unknown>, motorResp: Record<string, unknown>): string {
  const motor2 = ((motorResp?.motor2 as string) ?? "").toUpperCase().replace(/\s+/g, "").trim();
  if (motor2 === "VIABLE") return "aprobado";
  if (motor2 === "NOVIABLE") return "no_viable";

  const proc = (motorResp?.processing ?? {}) as Record<string, unknown>;
  if (proc?.viabilidadDef === 1) return "aprobado";
  if (proc?.viabilidadDef === 0) return "no_viable";
  if (motor2) return "en_revision";

  const motor1 = v1Resp?.motor1;
  if (motor1 === 2) return "rechazado";
  if (motor1 === 1) return "en_revision";
  return "pendiente";
}

function extractScore(mdResp: Record<string, unknown>): number | null {
  if (!mdResp) return null;
  const detallado = (mdResp?.detallado ?? {}) as Record<string, unknown>;
  const asociado  = (mdResp?.datos_asociado ?? {}) as Record<string, unknown>;
  const score = detallado?.tu_score ?? asociado?.scoreTU;
  return typeof score === "number" ? score : null;
}

function decisionTexto(v1Resp: Record<string, unknown>, motorResp: Record<string, unknown>): string {
  const motor2 = motorResp?.motor2 as string | undefined;
  if (motor2) return motor2;
  const status = motorResp?.status as string | undefined;
  if (status) return status;
  const motor1 = v1Resp?.motor1;
  if (motor1 === 1) return "Pendiente de motor";
  if (motor1 === 2) return (v1Resp?.mensaje as string) ?? "No apto en validación inicial";
  return "Pendiente de validación";
}

function norm(v: unknown): 1 | 2 | null {
  if (v === 1) return 1;
  if (v === 2) return 2;
  return null;
}

function normBool(v: unknown): 1 | 2 | null {
  if (v === 1) return 1;
  if (v === 0) return 2;
  return null;
}

function buildValidaciones(v1Resp: Record<string, unknown>, motorResp: Record<string, unknown>) {
  const items = [
    { label: "Resultado Validación 1",    key: "motor1",               estado: norm(v1Resp?.motor1) },
    { label: "Validación Identidad (ID)", key: "valida_id",            estado: norm(v1Resp?.valida_id) },
    { label: "Validación Email",          key: "valida_email",         estado: norm(v1Resp?.valida_email) },
    { label: "Validación Celular",        key: "valida_celular",       estado: norm(v1Resp?.valida_celular) },
    { label: "Validación Apellido",       key: "valida_last_name",     estado: norm(v1Resp?.valida_last_name) },
    { label: "Validación Capacidad",      key: "valida_capacidad",     estado: norm(v1Resp?.valida_capacidad) },
    { label: "Validación Estado Laboral", key: "valida_estado_laboral",estado: norm(v1Resp?.valida_estado_laboral) },
  ];

  const proc = (motorResp?.processing ?? {}) as Record<string, unknown>;
  if (Object.keys(proc).length) {
    items.push(
      { label: "Viabilidad crediticia", key: "viabilidadDef", estado: normBool(proc?.viabilidadDef) },
      { label: "Viabilidad criterio 1", key: "viabilidad1",   estado: normBool(proc?.viabilidad1) },
    );
  }

  return items;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — listar solicitudes
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  const limit        = parseInt(req.nextUrl.searchParams.get("limit") ?? "200");
  const cedulaFilter = req.nextUrl.searchParams.get("cedulaFilter") ?? undefined;

  const where: { cedula?: string } = {};
  if (cedulaFilter) where.cedula = cedulaFilter;

  try {
    const v1Rows = await prisma.valida1Results.findMany({
      where,
      select: {
        radicado:     true,
        cedula:       true,
        responseJson: true,
        createdAt:    true,
        gestionadoAt: true,
        motorProcess: { select: { responseJson: true } },
        motorData:    { select: { responseJson: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    type V1Row = (typeof v1Rows)[number];
    const data = v1Rows.map((v1: V1Row) => {
      const motor = v1.motorProcess ?? null;
      const md    = v1.motorData    ?? null;

      const v1Resp    = (v1.responseJson    ?? {}) as Record<string, unknown>;
      const motorResp = (motor?.responseJson ?? {}) as Record<string, unknown>;
      const mdResp    = (md?.responseJson    ?? {}) as Record<string, unknown>;

      return {
        radicado:      v1.radicado,
        cedula:        v1.cedula,
        solicitante:   buildSolicitante(v1Resp, mdResp),
        fecha:         parseFecha(v1.radicado, v1.createdAt.toISOString()),
        valor:         extractMonto(mdResp, motorResp),
        estado:        deriveEstado(v1Resp, motorResp),
        score:         extractScore(mdResp),
        decisionTexto: decisionTexto(v1Resp, motorResp),
        sinMotor:      !motor,
        gestionado:    !!v1.gestionadoAt,
        gestionadoAt:  v1.gestionadoAt?.toISOString() ?? null,
        validaciones:  buildValidaciones(v1Resp, motorResp),
      };
    });

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error interno.";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH — marcar como gestionado
// ─────────────────────────────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  try {
    const { radicado } = await req.json() as { radicado?: string };
    if (!radicado) {
      return NextResponse.json({ ok: false, message: "Radicado requerido." }, { status: 400 });
    }

    await prisma.valida1Results.update({
      where: { radicado },
      data: {
        gestionadoAt: new Date(),
        gestionadoBy: session.user.email ?? "unknown",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error interno.";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
