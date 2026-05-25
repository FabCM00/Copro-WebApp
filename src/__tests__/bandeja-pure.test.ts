import { describe, it, expect, vi } from "vitest";

// El módulo bandeja.ts importa el cliente Supabase al nivel del módulo.
// Mockeamos @/lib/supabase/client para que las funciones puras se puedan
// testear sin credenciales de Supabase en el entorno de CI.
vi.mock("@/lib/supabase/client", () => ({
    supabase: {},
    supabaseIsolated: {},
    CAPTURED_AUTH_HASH: "",
    SUPABASE_URL: "https://mock.supabase.co",
    SUPABASE_ANON_KEY: "mock-key",
}));

import {
    norm,
    normBool,
    deriveEstado,
    parseFecha,
} from "@/lib/supabase/bandeja";
import type { Valida1Row, MotorProcessRow } from "@/lib/supabase/bandeja";

// ─── Helpers de normalización ─────────────────────────────────────────────────

describe("norm", () => {
    it("retorna 1 para valor 1", () => expect(norm(1)).toBe(1));
    it("retorna 2 para valor 2", () => expect(norm(2)).toBe(2));
    it("retorna null para undefined", () => expect(norm(undefined)).toBeNull());
    it("retorna null para null", () => expect(norm(null)).toBeNull());
    it("retorna null para valor fuera de rango", () => expect(norm(3)).toBeNull());
});

describe("normBool", () => {
    it("retorna 1 para 1 (cumple)", () => expect(normBool(1)).toBe(1));
    it("retorna 2 para 0 (no cumple)", () => expect(normBool(0)).toBe(2));
    it("retorna null para undefined", () => expect(normBool(undefined)).toBeNull());
    it("retorna null para null", () => expect(normBool(null)).toBeNull());
});

// ─── parseFecha ───────────────────────────────────────────────────────────────

describe("parseFecha", () => {
    it("extrae fecha del radicado en formato {cedula}_{DDMMYYHHMM}", () => {
        // radicado: 123_150524... → DD=15, MM=05, YY=24 → 2024-05-15
        const fecha = parseFecha("123_150524120000", "2020-01-01T00:00:00Z");
        expect(fecha).toBe("2024-05-15");
    });

    it("usa fallback cuando el radicado no tiene el formato esperado", () => {
        const fecha = parseFecha("radicado-sin-guion", "2023-07-22T10:00:00Z");
        expect(fecha).toBe("2023-07-22");
    });

    it("usa fallback cuando el sufijo no es numérico", () => {
        const fecha = parseFecha("abc_abcdef", "2023-01-01T00:00:00Z");
        expect(fecha).toBe("2023-01-01");
    });
});

// ─── deriveEstado ─────────────────────────────────────────────────────────────

function makeV1(motor1: number | undefined): Valida1Row {
    return {
        id: 1,
        radicado: "123_010124000000",
        cedula: "123",
        request_json: null,
        response_json: motor1 !== undefined ? { motor1, status: "", mensaje: "", radicado: "123_010124000000" } : null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
    };
}

function makeMotorProcess(motor2: string, viabilidadDef?: number): MotorProcessRow {
    return {
        id: 1,
        radicado: "123_010124000000",
        cedula: "123",
        request_json: null,
        response_json: {
            motor2,
            status: "ok",
            radicado: "123_010124000000",
            processing: viabilidadDef !== undefined ? { viabilidadDef } : undefined,
        },
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
    };
}

describe("deriveEstado — sin motor_process", () => {
    it("retorna rechazado cuando motor1 = 2", () => {
        expect(deriveEstado(makeV1(2), null)).toBe("rechazado");
    });

    it("retorna en_revision cuando motor1 = 1", () => {
        expect(deriveEstado(makeV1(1), null)).toBe("en_revision");
    });

    it("retorna pendiente cuando no hay response_json", () => {
        expect(deriveEstado(makeV1(undefined), null)).toBe("pendiente");
    });
});

describe("deriveEstado — con motor_process", () => {
    it("retorna aprobado cuando motor2 = VIABLE", () => {
        expect(deriveEstado(makeV1(1), makeMotorProcess("VIABLE"))).toBe("aprobado");
    });

    it("retorna aprobado cuando motor2 = Viable (case insensitive)", () => {
        expect(deriveEstado(makeV1(1), makeMotorProcess("Viable"))).toBe("aprobado");
    });

    it("retorna no_viable cuando motor2 = NO VIABLE", () => {
        expect(deriveEstado(makeV1(1), makeMotorProcess("NO VIABLE"))).toBe("no_viable");
    });

    it("retorna aprobado por viabilidadDef=1 cuando motor2 es inesperado", () => {
        expect(deriveEstado(makeV1(1), makeMotorProcess("OTRO", 1))).toBe("aprobado");
    });

    it("retorna no_viable por viabilidadDef=0 cuando motor2 es inesperado", () => {
        expect(deriveEstado(makeV1(1), makeMotorProcess("OTRO", 0))).toBe("no_viable");
    });

    it("retorna en_revision cuando motor2 no es reconocido y no hay viabilidadDef", () => {
        expect(deriveEstado(makeV1(1), makeMotorProcess("PROCESANDO"))).toBe("en_revision");
    });
});
