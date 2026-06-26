import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../../auth";
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
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ radicado: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { ok: false, message: "No autorizado." },
      { status: 401 },
    );
  }

  const { radicado } = await params;

  try {
    const v1 = await withPrismaRetry(() =>
      prisma.valida1Results.findUnique({
        where: { radicado },
        include: {
          motorProcess: true,
          motorData: true,
          identity: true,
          coprocenvaEnvios: true,
        },
      }),
    );

    if (!v1) {
      return NextResponse.json(
        { ok: false, message: "Solicitud no encontrada." },
        { status: 404 },
      );
    }

    const motor = v1.motorProcess ?? null;
    const md = v1.motorData ?? null;
    const iv = v1.identity ?? null;
    const env = v1.coprocenvaEnvios ?? null;

    const r = buildResponses({
      v1Resp: v1.responseJson,
      v1Req:  v1.requestJson,
      mdResp: md?.responseJson,
      mpResp: motor?.responseJson,
      idResp: iv?.responseJson,
      hasIdentity:    !!iv,
      hasMotorData:   !!md,
      hasMotorProcess: !!motor,
    });

    const data = {
      radicado: v1.radicado,
      cedula: v1.cedula,
      solicitante: buildSolicitante(r),
      fecha: parseFecha(v1.radicado, v1.createdAt.toISOString()),
      valor: extractMonto(r),
      estado: deriveEstado(r),
      score: extractScore(r),
      decisionTexto: decisionTexto(r),
      sinMotor: !motor,
      gestionado: !!v1.gestionadoAt,
      gestionadoAt: v1.gestionadoAt?.toISOString() ?? null,
      validaciones: buildValidaciones(r),
      raw: {
        valida1: {
          radicado: v1.radicado,
          cedula: v1.cedula,
          request_json: v1.requestJson ?? null,
          response_json: v1.responseJson ?? null,
          created_at: v1.createdAt.toISOString(),
          updated_at: v1.updatedAt.toISOString(),
          gestionado_at: v1.gestionadoAt?.toISOString() ?? null,
          gestionado_by: v1.gestionadoBy ?? null,
        },
        motor_process: motor
          ? {
            radicado: motor.radicado,
            cedula: motor.cedula,
            request_json: motor.requestJson ?? null,
            response_json: motor.responseJson ?? null,
          }
          : null,
        motor_data: md
          ? {
            radicado: md.radicado,
            cedula: md.cedula,
            request_json: md.requestJson ?? null,
            response_json: md.responseJson ?? null,
          }
          : null,
        identity: iv
          ? {
            radicado: iv.radicado,
            cedula: iv.cedula,
            request_json: iv.requestJson ?? null,
            response_json: iv.responseJson ?? null,
          }
          : null,
        coprocenva_envios: env
          ? {
            radicado: env.radicado,
            cedula: env.cedula,
            request_json: env.requestJson ?? null,
            response_json: env.responseJson ?? null,
          }
          : null,
        credito_decision: null,
      },
    };

    return NextResponse.json({ ok: true, data });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error interno.";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
