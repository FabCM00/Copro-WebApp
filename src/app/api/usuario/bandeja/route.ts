import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { prisma } from "@/lib/prisma";
import {
  buildResponses,
  buildSolicitante,
  extractMonto,
  extractScore,
  deriveEstado,
  decisionTexto,
  parseFecha,
  buildValidaciones,
} from "@/lib/coprocenva-derive";
import { withPrismaRetry } from "@/lib/prisma-retry";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { ok: false, message: "No autorizado." },
      { status: 401 },
    );
  }

  const p = req.nextUrl.searchParams;

  const limit = Math.min(Math.max(parseInt(p.get("limit") ?? "20"), 1), 100);
  const page  = Math.max(parseInt(p.get("page")  ?? "1"),  1);
  const skip  = (page - 1) * limit;

  const cedulaFilter    = p.get("cedulaFilter") ?? undefined;
  const q               = p.get("q")?.trim() ?? "";
  const gestionadoParam = p.get("gestionado"); // "true" | "false" | ausente

  // baseWhere: solo cedulaFilter — para los conteos globales de las pestañas
  const baseWhere: Prisma.Valida1ResultsWhereInput = {};
  if (cedulaFilter) baseWhere.cedula = cedulaFilter;

  // where: todos los filtros activos (gestionado + búsqueda de texto)
  const where: Prisma.Valida1ResultsWhereInput = { ...baseWhere };
  if (q) {
    where.OR = [
      { cedula:   { contains: q } },
      { radicado: { contains: q } },
    ];
  }
  if (gestionadoParam === "true")  where.gestionadoAt = { not: null };
  if (gestionadoParam === "false") where.gestionadoAt = null;

  try {
    const [total, totalActivas, totalGestionadas, v1Rows] =
      await withPrismaRetry(() =>
        Promise.all([
          prisma.valida1Results.count({ where }),
          prisma.valida1Results.count({ where: { ...baseWhere, gestionadoAt: null } }),
          prisma.valida1Results.count({ where: { ...baseWhere, gestionadoAt: { not: null } } }),
          prisma.valida1Results.findMany({
            where,
            select: {
              radicado:     true,
              cedula:       true,
              requestJson:  true,
              responseJson: true,
              createdAt:    true,
              gestionadoAt: true,
              motorProcess: { select: { responseJson: true } },
              motorData:    { select: { responseJson: true } },
              identity:     { select: { responseJson: true } },
            },
            orderBy: { createdAt: "desc" },
            skip,
            take: limit,
          }),
        ]),
      );

    type V1Row = (typeof v1Rows)[number];
    const data = v1Rows.map((v1: V1Row) => {
      const r = buildResponses({
        v1Resp: v1.responseJson,
        v1Req:  v1.requestJson,
        mdResp: v1.motorData?.responseJson,
        mpResp: v1.motorProcess?.responseJson,
        idResp: v1.identity?.responseJson,
        hasIdentity:     !!v1.identity,
        hasMotorData:    !!v1.motorData,
        hasMotorProcess: !!v1.motorProcess,
      });

      return {
        radicado:      v1.radicado,
        cedula:        v1.cedula,
        solicitante:   buildSolicitante(r),
        fecha:         parseFecha(v1.radicado, v1.createdAt.toISOString()),
        valor:         extractMonto(r),
        estado:        deriveEstado(r),
        score:         extractScore(r),
        decisionTexto: decisionTexto(r),
        sinMotor:      !v1.motorProcess,
        gestionado:    !!v1.gestionadoAt,
        gestionadoAt:  v1.gestionadoAt?.toISOString() ?? null,
        validaciones:  buildValidaciones(r),
      };
    });

    return NextResponse.json({
      ok: true,
      data,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      page,
      totalActivas,
      totalGestionadas,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error interno.";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { ok: false, message: "No autorizado." },
      { status: 401 },
    );
  }

  try {
    const { radicado } = (await req.json()) as { radicado?: string };
    if (!radicado) {
      return NextResponse.json(
        { ok: false, message: "Radicado requerido." },
        { status: 400 },
      );
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
