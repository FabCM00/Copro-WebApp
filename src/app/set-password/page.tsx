"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  LockKeyhole,
  AlertCircle,
  ArrowLeft,
  LogIn,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthIllustrationPage } from "@/components/auth/AuthIllustrationPage";
import { LoadingScreen } from "@/components/LoadingScreen";

const inputBase =
  "w-full h-12 rounded-[10px] border-[1.2px] bg-white pl-11 pr-11 text-base shadow-sm outline-none transition";
const inputNormal =
  "border-[#0D0D0D]/15 focus:border-[#F29A2E] focus:ring-2 focus:ring-[#F29A2E]/30";
const inputError =
  "border-red-500 bg-red-50 focus:border-red-600 focus:ring-2 focus:ring-red-200";

function SetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const token = searchParams.get("token");
  const isInvite = searchParams.get("type") === "invite";

  type TokenStatus = "checking" | "valid" | "already_used" | "expired" | "invalid";

  const [tokenStatus, setTokenStatus] = useState<TokenStatus>(token ? "checking" : "invalid");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(5);

  // Valida el token al montar
  useEffect(() => {
    if (!token) return;
    const endpoint = isInvite ? "/api/auth/accept-invite" : "/api/auth/reset-password";
    fetch(`${endpoint}?token=${token}`)
      .then((r) => r.json())
      .then((data: { ok: boolean; code?: string }) => {
        if (data.ok) { setTokenStatus("valid"); return; }
        if (data.code === "ALREADY_ACCEPTED" || data.code === "ALREADY_USED") {
          setTokenStatus("already_used");
        } else if (data.code === "EXPIRED") {
          // Para invitaciones: si expiraron probablemente ya fueron usadas antes
          // Para reset: enlace expirado genuino
          setTokenStatus(isInvite ? "already_used" : "expired");
        } else {
          setTokenStatus("invalid");
        }
      })
      .catch(() => setTokenStatus("invalid"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cuenta regresiva al completar — router.replace fuera del setState
  useEffect(() => {
    if (!done) return;
    if (countdown <= 0) { router.replace("/login"); return; }
    const id = setTimeout(() => setCountdown((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [done, countdown, router]);

  // ── Estados de validación del token ────────────────────────────────────────

  if (tokenStatus === "checking") {
    return <LoadingScreen message="Validando enlace…" />;
  }

  if (tokenStatus === "already_used") {
    return (
      <AuthIllustrationPage
        imageSrc="/forgot-password-exitoso.png"
        imageAlt="Cuenta activa"
        title="Tu cuenta ya está activa"
        body="Esta invitación ya fue utilizada. Tu contraseña ya fue creada, puedes iniciar sesión directamente."
      >
        <Button
          onClick={() => router.replace("/login")}
          className="flex h-12 w-full items-center justify-center rounded-[10px] bg-[#F29A2E] text-base font-semibold text-[#0D0D0D] shadow-sm transition hover:bg-[#F28A2E]"
        >
          <LogIn className="mr-2 h-4 w-4" />
          Ir al inicio de sesión
        </Button>
      </AuthIllustrationPage>
    );
  }

  if (tokenStatus === "expired") {
    return (
      <AuthIllustrationPage
        imageSrc="/forgot-password-error.png"
        imageAlt="Enlace expirado"
        title="Enlace expirado"
        body={
          isInvite
            ? "Esta invitación ha vencido. Solicita al administrador que te envíe una nueva."
            : "Este enlace de recuperación ha vencido. Solicita uno nuevo desde la pantalla de inicio de sesión."
        }
      >
        {!isInvite && (
          <Button
            onClick={() => router.replace("/forgot-password")}
            className="flex h-12 w-full items-center justify-center rounded-[10px] bg-[#F29A2E] text-base font-semibold text-[#0D0D0D] shadow-sm transition hover:bg-[#F28A2E]"
          >
            Solicitar nuevo enlace
          </Button>
        )}
        <Button
          onClick={() => router.replace("/login")}
          variant="outline"
          className="flex h-12 w-full items-center justify-center rounded-[10px] border-[#012340]/20 text-base font-semibold text-[#012340] transition hover:bg-[#012340]/5"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al inicio de sesión
        </Button>
      </AuthIllustrationPage>
    );
  }

  if (tokenStatus === "invalid") {
    return (
      <AuthIllustrationPage
        imageSrc="/forgot-password-error.png"
        imageAlt="Enlace inválido"
        title="Enlace inválido"
        body="Este enlace no es válido o no existe. Verifica que hayas copiado la URL completa del correo."
      >
        <Button
          onClick={() => router.replace("/login")}
          className="flex h-12 w-full items-center justify-center rounded-[10px] bg-[#F29A2E] text-base font-semibold text-[#0D0D0D] shadow-sm transition hover:bg-[#F28A2E]"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al inicio de sesión
        </Button>
      </AuthIllustrationPage>
    );
  }

  if (done) {
    return (
      <AuthIllustrationPage
        imageSrc="/forgot-password-exitoso.png"
        imageAlt="Contraseña creada"
        title="¡Contraseña creada exitosamente!"
        body="Tu acceso al Portal Fondex está listo. Ya puedes ingresar con tus credenciales."
      >
        <p className="text-center text-sm text-[#0D0D0D]/45">
          Redirigiendo en{" "}
          <span className="font-bold text-[#F29A2E]">{countdown}s</span>…
        </p>
        <Button
          onClick={() => router.replace("/login")}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-[#F29A2E] text-base font-semibold text-[#0D0D0D] shadow-sm transition hover:bg-[#F28A2E]"
        >
          <LogIn className="mr-1 h-4 w-4" />
          Ir al inicio de sesión
        </Button>
      </AuthIllustrationPage>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError("La contraseña debe contener al menos una mayúscula.");
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError("La contraseña debe contener al menos un número.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    try {
      const endpoint = isInvite
        ? "/api/auth/accept-invite"
        : "/api/auth/reset-password";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.ok) {
        setError(
          json?.message ??
            "Token inválido o expirado. Solicita un nuevo enlace.",
        );
        return;
      }

      setDone(true);
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const showErr = !!error;

  return (
    <AuthShell>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-[#012340]">
          {isInvite ? "Crea tu contraseña" : "Nueva contraseña"}
        </h1>
        <p className="text-base font-medium text-[#0D0D0D]/60">
          {isInvite
            ? "Configura el acceso seguro para tu nueva cuenta."
            : "Elige una contraseña segura para recuperar tu acceso."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-[#012340]">
            Nueva contraseña
          </label>
          <div className="relative">
            <ShieldCheck
              className={cn(
                "pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 transition",
                showErr ? "text-red-500" : "text-[#0D0D0D]/40",
              )}
            />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Escribe tu nueva contraseña"
              value={password}
              autoFocus
              onChange={(e) => setPassword(e.target.value)}
              required
              className={cn(inputBase, showErr ? inputError : inputNormal)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className={cn(
                "absolute right-3.5 top-1/2 -translate-y-1/2 transition",
                showErr
                  ? "text-red-500 hover:text-red-700"
                  : "text-[#0D0D0D]/40 hover:text-[#0D0D0D]/70",
              )}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-[#012340]">
            Confirmar contraseña
          </label>
          <div className="relative">
            <LockKeyhole
              className={cn(
                "pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 transition",
                showErr ? "text-red-500" : "text-[#0D0D0D]/40",
              )}
            />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Repite tu contraseña"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              className={cn(inputBase, showErr ? inputError : inputNormal)}
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-[10px] border border-red-200 bg-red-50 px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            <p className="text-sm font-medium text-red-600">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-[10px] bg-[#F29A2E] text-base font-semibold text-[#0D0D0D] shadow-sm transition hover:bg-[#F28A2E] disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : isInvite ? (
            "Crear contraseña"
          ) : (
            "Guardar contraseña"
          )}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense>
      <SetPasswordForm />
    </Suspense>
  );
}
