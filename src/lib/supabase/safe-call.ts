import type { SafeError, SafeResult } from "./types";

export interface SafeCallOptions {
    label: string;
    timeoutMs?: number;
    debug?: boolean;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const isDev =
    typeof process !== "undefined" && process.env?.NODE_ENV !== "production";

export async function safeCall<T>(
    fn: () => Promise<{ data: T | null; error: unknown } | T>,
    options: SafeCallOptions,
): Promise<SafeResult<T>> {
    const { label, timeoutMs = DEFAULT_TIMEOUT_MS, debug = isDev } = options;
    const start = Date.now();

    if (debug) console.log("[supabase] -> " + label);

    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<SafeResult<T>>((resolve) => {
        timeoutHandle = setTimeout(() => {
            const err: SafeError = {
                code: "timeout",
                message: 'La operacion "' + label + '" supero el limite de ' + timeoutMs + "ms.",
            };
            if (debug) console.warn("[supabase] x " + label + " TIMEOUT after " + timeoutMs + "ms");
            resolve({ ok: false, error: err });
        }, timeoutMs);
    });

    const work = (async (): Promise<SafeResult<T>> => {
        try {
            const result = await fn();
            if (
                result !== null &&
                typeof result === "object" &&
                ("data" in (result as object) || "error" in (result as object))
            ) {
                const r = result as { data: T | null; error: unknown };
                if (r.error) {
                    return { ok: false, error: classifySupabaseError(r.error) };
                }
                return { ok: true, data: r.data as T };
            }
            return { ok: true, data: result as T };
        } catch (e: unknown) {
            return { ok: false, error: classifyException(e) };
        }
    })();

    const winner = await Promise.race([work, timeoutPromise]);
    if (timeoutHandle) clearTimeout(timeoutHandle);

    if (debug) {
        const elapsed = Date.now() - start;
        if (winner.ok) {
            console.log("[supabase] OK " + label + " (" + elapsed + "ms)");
        } else if (winner.error.code !== "timeout") {
            console.warn("[supabase] x " + label + " (" + elapsed + "ms)", winner.error.code, winner.error.message);
        }
    }

    return winner;
}

/** Convierte un error de Supabase/PostgREST (forma objeto) a SafeError. @internal */
export function classifySupabaseError(err: unknown): SafeError {
    const raw = err != null && typeof err === "object" ? (err as Record<string, unknown>) : {};
    const message = String(raw.message ?? raw.error_description ?? raw.msg ?? "Error desconocido");
    const status = typeof raw.status === "number" ? raw.status : undefined;
    const code = typeof raw.code === "string" ? raw.code : undefined;

    if (code === "PGRST116" || status === 404 || /cannot coerce/i.test(message))
        return { code: "not_found", message, cause: err };
    if (
        status === 401 || status === 403 ||
        /invalid.*credentials/i.test(message) ||
        /jwt/i.test(message) ||
        /not authenticated/i.test(message)
    ) return { code: "auth", message, cause: err };
    if (status && status >= 400 && status < 500) return { code: "validation", message, cause: err };
    if (status && status >= 500) return { code: "server", message, cause: err };
    return { code: "unknown", message, cause: err };
}

/** Convierte una excepción de JavaScript a SafeError. @internal */
export function classifyException(e: unknown): SafeError {
    const raw = e != null && typeof e === "object" ? (e as Record<string, unknown>) : {};
    const name = typeof raw.name === "string" ? raw.name : "";
    const message = typeof raw.message === "string" ? raw.message : String(e ?? "Error desconocido");

    if (name === "AbortError") return { code: "timeout", message: "La operacion fue cancelada.", cause: e };
    if (name === "TypeError" && /fetch|network/i.test(message)) {
        return { code: "network", message: "No se pudo conectar al servidor.", cause: e };
    }
    return { code: "unknown", message, cause: e };
}
