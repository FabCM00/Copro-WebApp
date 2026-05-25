/**
 * Rate limiter distribuido con Upstash Redis.
 *
 * Cuando UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN están definidas,
 * usa sliding window en Redis — funciona correctamente en serverless/multi-instancia.
 *
 * Sin esas variables, cae en un Map en memoria con un warning:
 * solo es aceptable en desarrollo local; en producción multi-instancia cada
 * cold start resetea el contador.
 *
 * Variables de entorno requeridas para Upstash:
 *   UPSTASH_REDIS_REST_URL=https://<tu-db>.upstash.io
 *   UPSTASH_REDIS_REST_TOKEN=<tu-token>
 *
 * Puedes obtenerlas en https://console.upstash.com → tu base de datos → REST API.
 */

export interface RateLimitResult {
    allowed: boolean;
    /** Milisegundos hasta que se pueda reintentar (0 si está permitido). */
    retryAfterMs: number;
}

const RATE_MAX = 5;
const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutos

// ─── Fallback en memoria (solo desarrollo / instancia única) ──────────────────

const memoryStore = new Map<string, { count: number; resetAt: number }>();

function memoryLimit(key: string): RateLimitResult {
    const now = Date.now();
    const entry = memoryStore.get(key);

    if (!entry || now > entry.resetAt) {
        memoryStore.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
        return { allowed: true, retryAfterMs: 0 };
    }

    if (entry.count >= RATE_MAX) {
        return { allowed: false, retryAfterMs: entry.resetAt - now };
    }

    entry.count++;
    return { allowed: true, retryAfterMs: 0 };
}

// ─── Singleton del limiter de Upstash ─────────────────────────────────────────

let _upstashLimiter: {
    limit: (key: string) => Promise<{ success: boolean; reset: number }>;
} | null = null;
let _upstashChecked = false;

async function getUpstashLimiter() {
    if (_upstashChecked) return _upstashLimiter;
    _upstashChecked = true;

    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
        _upstashLimiter = null;
        return null;
    }

    try {
        const { Ratelimit } = await import("@upstash/ratelimit");
        const { Redis } = await import("@upstash/redis");

        _upstashLimiter = new Ratelimit({
            redis: new Redis({ url, token }),
            limiter: Ratelimit.slidingWindow(RATE_MAX, "15 m"),
            analytics: false,
            prefix: "portal:invite",
        });

        return _upstashLimiter;
    } catch (err) {
        console.error("[rate-limit] Error inicializando Upstash:", err);
        _upstashLimiter = null;
        return null;
    }
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Verifica si la key (típicamente una IP) supera el límite configurado.
 *
 * @param key - Identificador único del solicitante (IP, userId, etc.)
 */
export async function checkRateLimit(key: string): Promise<RateLimitResult> {
    const limiter = await getUpstashLimiter();

    if (limiter) {
        const { success, reset } = await limiter.limit(key);
        return {
            allowed: success,
            retryAfterMs: success ? 0 : Math.max(0, reset - Date.now()),
        };
    }

    if (process.env.NODE_ENV === "production") {
        console.warn(
            "[rate-limit] Upstash no configurado — usando Map en memoria. " +
            "No es seguro en deployments multi-instancia. " +
            "Define UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN.",
        );
    }

    return memoryLimit(key);
}
