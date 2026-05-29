import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isRateLimited } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ ok: false, code: "MISSING_TOKEN" }, { status: 400 });

  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
    select: { used: true, expiresAt: true },
  });

  if (!record)              return NextResponse.json({ ok: false, code: "NOT_FOUND"    }, { status: 400 });
  if (record.used)          return NextResponse.json({ ok: false, code: "ALREADY_USED" }, { status: 400 });
  if (record.expiresAt < new Date()) return NextResponse.json({ ok: false, code: "EXPIRED"    }, { status: 400 });

  return NextResponse.json({ ok: true });
}

const schema = z.object({
  token: z.string().min(1, "Token requerido"),
  password: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
    .regex(/[0-9]/, "Debe contener al menos un número"),
});

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (await isRateLimited(ip, 5, 60 * 1000)) {
    return NextResponse.json(
      { ok: false, message: "Demasiados intentos." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Body inválido." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: parsed.error?.message ?? "Datos inválidos.",
      },
      { status: 400 },
    );
  }

  const { token, password } = parsed.data;

  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
    select: { id: true, userId: true, used: true, expiresAt: true },
  });

  if (!record || record.used || record.expiresAt < new Date()) {
    return NextResponse.json(
      { ok: false, message: "Token inválido o expirado. Solicita un nuevo enlace." },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash, active: true },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { used: true },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
