import { describe, it, expect, beforeEach, vi } from "vitest";

// Aislar el módulo para que cada test empiece con Map vacío
beforeEach(() => {
    vi.resetModules();
});

describe("rate-limit — fallback en memoria (desarrollo)", () => {
    it("permite la primera solicitud", async () => {
        const { checkRateLimit } = await import("@/lib/rate-limit");
        const result = await checkRateLimit("test-ip-1");
        expect(result.allowed).toBe(true);
        expect(result.retryAfterMs).toBe(0);
    });

    it("permite hasta RATE_MAX solicitudes en la ventana", async () => {
        const { checkRateLimit } = await import("@/lib/rate-limit");
        const key = "test-ip-burst";
        // 5 solicitudes permitidas (RATE_MAX = 5)
        for (let i = 0; i < 5; i++) {
            const r = await checkRateLimit(key);
            expect(r.allowed).toBe(true);
        }
    });

    it("bloquea la solicitud N+1 cuando se supera el límite", async () => {
        const { checkRateLimit } = await import("@/lib/rate-limit");
        const key = "test-ip-blocked";
        for (let i = 0; i < 5; i++) await checkRateLimit(key);
        const blocked = await checkRateLimit(key);
        expect(blocked.allowed).toBe(false);
        expect(blocked.retryAfterMs).toBeGreaterThan(0);
    });

    it("keys distintas tienen contadores independientes", async () => {
        const { checkRateLimit } = await import("@/lib/rate-limit");
        for (let i = 0; i < 5; i++) await checkRateLimit("ip-a");
        const r = await checkRateLimit("ip-b");
        expect(r.allowed).toBe(true);
    });
});

describe("rate-limit — falla duro en producción sin Redis", () => {
    it("lanza error si NODE_ENV=production y no hay Redis", async () => {
        const orig = process.env.NODE_ENV;
        // @ts-expect-error — sobreescribir NODE_ENV para el test
        process.env.NODE_ENV = "production";
        delete process.env.UPSTASH_REDIS_REST_URL;
        delete process.env.UPSTASH_REDIS_REST_TOKEN;

        const { checkRateLimit } = await import("@/lib/rate-limit");
        await expect(checkRateLimit("ip-prod")).rejects.toThrow(
            /Upstash Redis no configurado/i,
        );

        // @ts-expect-error
        process.env.NODE_ENV = orig;
    });
});
