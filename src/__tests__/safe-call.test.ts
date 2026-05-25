import { describe, it, expect } from "vitest";
import { classifySupabaseError, classifyException } from "@/lib/supabase/safe-call";

describe("classifySupabaseError", () => {
    it("clasifica PGRST116 como not_found", () => {
        const r = classifySupabaseError({ code: "PGRST116", message: "no rows" });
        expect(r.code).toBe("not_found");
    });

    it("clasifica status 404 como not_found", () => {
        const r = classifySupabaseError({ status: 404, message: "not found" });
        expect(r.code).toBe("not_found");
    });

    it("clasifica status 401 como auth", () => {
        const r = classifySupabaseError({ status: 401, message: "unauthorized" });
        expect(r.code).toBe("auth");
    });

    it("clasifica status 403 como auth", () => {
        const r = classifySupabaseError({ status: 403, message: "forbidden" });
        expect(r.code).toBe("auth");
    });

    it("clasifica 'invalid credentials' como auth", () => {
        const r = classifySupabaseError({ message: "Invalid login credentials" });
        expect(r.code).toBe("auth");
    });

    it("clasifica status 400 como validation", () => {
        const r = classifySupabaseError({ status: 400, message: "bad request" });
        expect(r.code).toBe("validation");
    });

    it("clasifica status 500 como server", () => {
        const r = classifySupabaseError({ status: 500, message: "internal error" });
        expect(r.code).toBe("server");
    });

    it("clasifica error sin status ni code como unknown", () => {
        const r = classifySupabaseError({ message: "algo raro" });
        expect(r.code).toBe("unknown");
    });

    it("usa mensaje de fallback cuando no hay message", () => {
        const r = classifySupabaseError({});
        expect(r.message).toBe("Error desconocido");
    });

    it("maneja null sin crashear", () => {
        const r = classifySupabaseError(null);
        expect(r.code).toBe("unknown");
        expect(r.message).toBe("Error desconocido");
    });

    it("maneja string sin crashear", () => {
        const r = classifySupabaseError("error crudo");
        expect(r.code).toBe("unknown");
    });

    it("preserva el error original en cause", () => {
        const orig = { status: 500, message: "db down" };
        const r = classifySupabaseError(orig);
        expect(r.cause).toBe(orig);
    });
});

describe("classifyException", () => {
    it("clasifica AbortError como timeout", () => {
        const e = Object.assign(new Error("aborted"), { name: "AbortError" });
        const r = classifyException(e);
        expect(r.code).toBe("timeout");
    });

    it("clasifica TypeError de red como network", () => {
        const e = Object.assign(new TypeError("fetch failed"), { name: "TypeError" });
        const r = classifyException(e);
        expect(r.code).toBe("network");
    });

    it("clasifica error genérico como unknown", () => {
        const r = classifyException(new Error("algo fallo"));
        expect(r.code).toBe("unknown");
        expect(r.message).toBe("algo fallo");
    });

    it("maneja null sin crashear", () => {
        const r = classifyException(null);
        expect(r.code).toBe("unknown");
    });

    it("maneja string sin crashear", () => {
        const r = classifyException("boom");
        expect(r.code).toBe("unknown");
    });
});
