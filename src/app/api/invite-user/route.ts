import { NextRequest, NextResponse } from "next/server";
import { inviteUser } from "@/lib/api/invitations";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
    // 1. Rate limiting distribuido por IP (Upstash Redis en prod, Map en dev)
    const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    const rateResult = await checkRateLimit(ip);
    if (!rateResult.allowed) {
        const retryAfterSec = Math.ceil(rateResult.retryAfterMs / 1000);
        return NextResponse.json(
            {
                ok: false,
                code: "rate_limited",
                message: "Demasiados intentos. Espera 15 minutos antes de volver a intentar.",
            },
            {
                status: 429,
                headers: { "Retry-After": String(retryAfterSec) },
            },
        );
    }

    // 2. Verificar sesión y rol del solicitante
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) {
        return NextResponse.json(
            { ok: false, code: "unauthorized", message: "No autorizado." },
            { status: 401 },
        );
    }

    const admin = getSupabaseAdmin();
    const {
        data: { user: caller },
        error: userError,
    } = await admin.auth.getUser(token);

    if (userError || !caller) {
        return NextResponse.json(
            { ok: false, code: "unauthorized", message: "Sesión inválida." },
            { status: 401 },
        );
    }

    const { data: callerProfile } = await admin
        .from("profiles")
        .select("role")
        .eq("id", caller.id)
        .single();

    if (callerProfile?.role !== "admin") {
        return NextResponse.json(
            {
                ok: false,
                code: "forbidden",
                message: "No tienes permisos para invitar usuarios.",
            },
            { status: 403 },
        );
    }

    // 3. Validar body
    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json(
            { ok: false, code: "invalid_json", message: "Body inválido." },
            { status: 400 },
        );
    }

    const email: string | undefined = body?.email;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof email !== "string" || !emailRegex.test(email)) {
        return NextResponse.json(
            {
                ok: false,
                code: "invalid_email",
                message: "El email es requerido y debe ser válido.",
            },
            { status: 400 },
        );
    }

    const username: string | undefined =
        typeof body?.username === "string" && body.username.trim()
            ? body.username.trim()
            : undefined;

    const origin =
        process.env.NEXT_PUBLIC_APP_URL ??
        req.headers.get("origin") ??
        "http://localhost:3000";

    const result = await inviteUser({ email, username, appOrigin: origin });

    const status = result.ok
        ? 200
        : result.code === "invalid_email"
            ? 400
            : result.code === "exists"
                ? 409
                : 500;

    return NextResponse.json(result, { status });
}
