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

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { ok: false, message: "No autorizado." },
      { status: 401 },
    );
  }

  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "200");
  const cedulaFilter =
    req.nextUrl.searchParams.get("cedulaFilter") ?? undefined;

  const where: { cedula?: string } = {};
  if (cedulaFilter) where.cedula = cedulaFilter;

  try {
    const v1Rows = await prisma.valida1Results.findMany({
      where,
      select: {
        radicado: true,
        cedula: true,
        requestJson: true,
        responseJson: true,
        createdAt: true,
        gestionadoAt: true,
        motorProcess: { select: { responseJson: true } },
        motorData: { select: { responseJson: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    type V1Row = (typeof v1Rows)[number];
    const data = v1Rows.map((v1: V1Row) => {
      const r = buildResponses({
        v1Resp: v1.responseJson,
        v1Req: v1.requestJson,
        mdResp: v1.motorData?.responseJson,
        mpResp: v1.motorProcess?.responseJson,
      });

      return {
        radicado: v1.radicado,
        cedula: v1.cedula,
        solicitante: buildSolicitante(r),
        fecha: parseFecha(v1.radicado, v1.createdAt.toISOString()),
        valor: extractMonto(r),
        estado: deriveEstado(r),
        score: extractScore(r),
        decisionTexto: decisionTexto(r),
        sinMotor: !v1.motorProcess,
        gestionado: !!v1.gestionadoAt,
        gestionadoAt: v1.gestionadoAt?.toISOString() ?? null,
        validaciones: buildValidaciones(r),
      };
    });

    return NextResponse.json({ ok: true, data });
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
