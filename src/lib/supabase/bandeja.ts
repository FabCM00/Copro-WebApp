import { supabase } from "./client";
import { safeCall } from "./safe-call";
import type { SafeResult } from "./types";

/**
 * Capa de datos para la Bandeja de Solicitudes.
 *
 * Universo: `valida1_results` — cada radicado nace aquí.
 * Las tablas relacionadas se unen por `radicado` (FK real del schema).
 *
 * Tablas:
 *   valida1_results      → validación inicial (fuente de verdad)
 *   motor_data_results   → datos enriquecidos de APIs externas
 *   motor_process_results → decisión del motor de crédito
 *   identity_results     → validación de identidad facial/documental
 *
 * Todos los datos de negocio viven en request_json / response_json (JSONB).
 */

// ─── Tipos de filas DB (schema real) ──────────────────────────────────────────

export interface Valida1Row {
    id: number;
    radicado: string;
    cedula: string;
    request_json: Valida1Req | null;
    response_json: Valida1Resp | null;
    created_at: string;
    updated_at: string;
    // Campos de gestión — requieren migration si no existen:
    // ALTER TABLE valida1_results ADD COLUMN gestionado_at timestamptz;
    // ALTER TABLE valida1_results ADD COLUMN gestionado_by text;
    gestionado_at?: string | null;
    gestionado_by?: string | null;
}

export interface Valida1Req {
    id: number | string;
    email?: string;
    celular?: string;
    last_name?: string;
}

export interface Valida1Resp {
    motor1: number;              // 1 = cumple, 2 = no cumple
    status: string;
    mensaje: string;
    radicado: string;
    valida_id?: number;          // Validación de identidad
    valida_email?: number;
    valida_celular?: number;
    valida_last_name?: number;
    valida_capacidad?: number;
    valida_estado_laboral?: number;
    datos_asociado?: {
        id?: string | number;
        email?: string;
        celular?: string;
        last_name?: string;
        nombre_completo?: string;
        payroll_deduction?: number;
        sueldo_basico_mensual?: number;
        codigo_interno_cliente?: number;
    };
    detalles_rechazo?: string[];
}

export interface MotorDataRow {
    id: number;
    radicado: string;
    cedula: string;
    request_json: Record<string, unknown> | null;
    response_json: MotorDataResp | null;
    created_at: string;
    updated_at: string;
}

export interface MotorDataResp {
    status: string;
    radicado: string;
    detallado?: { cedula?: string; tu_score?: number };
    errores_apis?: Record<string, unknown>;
    api_responses?: Record<string, unknown>;
    datos_asociado?: MotorDataAsociado;
    eficacia_params_usados?: unknown;
}

export interface MotorDataAsociado {
    id?: number;
    banco?: string;
    email?: string;
    deudor?: string;
    aportes?: number;
    celular?: string;
    muebles?: number;
    scoreTU?: number;
    zonaCode?: string;
    moraFondo?: number;
    moraOtros?: number;
    ocupacion?: string;
    segSocial?: number;
    cuotaOtros?: number;
    saldoOtros?: number;
    tipoCuenta?: string;
    zonaNombre?: string;
    cargoActual?: string;
    estadoFondo?: number;
    fechaFondex?: string;
    otroSalario?: number;
    salarioBase?: number;
    seccionCode?: string;
    cuotaConsumo?: number;
    moraConsumo6?: number;
    saldoConsumo?: number;
    sucursalCode?: string;
    tipoContrato?: string;
    cuentaAhorros?: string;
    cuotaVivienda?: number;
    fechaEficacia?: string;
    finalEficacia?: string | null;
    moraVivienda6?: number;
    saldoVivienda?: number;
    seccionNombre?: string;
    tipoDocumento?: string;
    valorCreditos?: number;
    estadoEficacia?: string;
    saldoCaptacion?: number;
    sucursalNombre?: string;
    activosVehiculo?: number;
    activosVivienda?: number;
    descuentosFondo?: number;
    fechaNacimiento?: string;
    lugarExpedicion?: string;
    ahorroPermanente?: number;
    creditosVigentes?: number;
    otrasDeducciones?: number;
}

export interface MotorProcessRow {
    id: number;
    radicado: string;
    cedula: string;
    request_json: Record<string, unknown> | null;
    response_json: MotorProcessResp | null;
    created_at: string;
    updated_at: string;
}

export interface MotorProcessResp {
    motor2: string;       // "Viable" | "No Viable"
    status: string;
    radicado: string;
    oferta?: MotorOferta;
    processing?: MotorProcessing;
}

export interface MotorOferta {
    linea?: string;
    monto?: number;
    plazo?: number;
    escenario?: string;
    cuota_mensual?: number;
    tasa_mes_vencida?: number;
    tasa_efectiva_anual?: number;
}

export interface MotorProcessing {
    edad?: number;
    cupoMax?: number;
    cuotaDef?: number;
    plazoDef?: number;
    plazoMax?: number;
    valorDef?: number;
    solvencia?: number;
    egresoFam?: number;
    egresoTotal?: number;
    egresoSector?: number;
    capacPagoDisp?: number;
    disponibleDesp?: number;
    viabilidad1?: number;    // 1 = cumple, 0 = no cumple
    viabilidadDef?: number;  // 1 = cumple, 0 = no cumple
    scoreFondex?: number;
    perfilFondex?: string;
    prestaciones?: number;
    antEficacia?: number;
    antFondexYear?: number;
    fechaEvaluacion?: string;
    puntosEdad?: number;
    puntoSalario?: number;
    puntosFondex?: number;
    puntosCreditos?: number;
    puntosEficacia?: number;
    puntosCapta?: number;
    puntosCoontrato?: number;
    lineaCredito?: number;
    modalidadCredito?: number;
    creditoDisponible?: number;
    maxMoraSector?: number;
    cuotaCredito?: number;
}

export interface IdentityRow {
    id: number;
    radicado: string;
    cedula: string;
    request_json: IdentityPayload | null;
    response_json: IdentityPayload | null;
    created_at: string;
    updated_at: string;
}

export interface IdentityPayload {
    id?: string | number;
    radicado?: string;
    status_face?: number;       // 1 = ok, 0 = fail
    status_document?: number;   // 1 = ok, 0 = fail
    tipo_validacion?: number;
}

// ─── Tipos UI ─────────────────────────────────────────────────────────────────

export type SolicitudEstado =
    | "aprobado"
    | "preaprobado"
    | "en_revision"
    | "pendiente"
    | "rechazado"
    | "no_viable";

export interface ValidacionItem {
    label: string;
    key: string;
    estado: 1 | 2 | null;
}

export interface SolicitudUI {
    radicado: string;
    cedula: string;
    solicitante: string;
    fecha: string;
    /** Monto aprobado por el motor (oferta.monto). 0 si sin motor. */
    valor: number;
    estado: SolicitudEstado;
    /** Score TransUnion del asociado. null si no hay motor_data aún. */
    score: number | null;
    /** Texto descriptivo de la decisión para el header. */
    decisionTexto: string;
    /** True si NO existe motor_process_results para este radicado. */
    sinMotor: boolean;
    /** True si el operador marcó esta solicitud como gestionada. */
    gestionado: boolean;
    /** ISO timestamp de gestión. null si no gestionada. */
    gestionadoAt: string | null;
    /** Items de validación para el panel de criterios clave. */
    validaciones: ValidacionItem[];
    raw: {
        valida1: Valida1Row;
        motor_process: MotorProcessRow | null;
        motor_data: MotorDataRow | null;
        identity: IdentityRow | null;
    };
}

// ─── Opciones de listado ──────────────────────────────────────────────────────

export interface ListSolicitudesOptions {
    limit?: number;
    /** Filtra por cédula exacta en la DB. */
    cedulaFilter?: string;
    /**
     * Filtra por estado de gestión en la DB (columna gestionado_at).
     * true  → solo gestionados (gestionado_at IS NOT NULL)
     * false → solo activos    (gestionado_at IS NULL)
     * omitir → sin filtro     (todos)
     */
    gestionadoFilter?: boolean;
    /**
     * Filtra por cédula o radicado que comiencen con el texto dado.
     * Se aplica en la DB antes de traer datos.
     */
    searchPrefix?: string;
}

// ─── Helpers de derivación ────────────────────────────────────────────────────

/** Normaliza valores 1/2 del esquema interno. @internal */
export function norm(v: number | null | undefined): 1 | 2 | null {
    if (v === 1) return 1;
    if (v === 2) return 2;
    return null;
}

/** Normaliza valores booleanos 0/1 a convencion 1/2. @internal */
export function normBool(v: number | null | undefined): 1 | 2 | null {
    if (v === 1) return 1;
    if (v === 0) return 2;
    return null;
}

/** @internal */
export function deriveEstado(
    v1: Valida1Row,
    motor: MotorProcessRow | null,
): SolicitudEstado {
    if (motor) {
        const motor2 = (motor.response_json?.motor2 ?? "").toUpperCase().trim();
        if (motor2 === "VIABLE") return "aprobado";
        if (motor2 === "NO VIABLE") return "no_viable";
        // Fallback al flag interno de viabilidad
        const proc = motor.response_json?.processing;
        if (proc?.viabilidadDef === 1) return "aprobado";
        if (proc?.viabilidadDef === 0) return "no_viable";
        return "en_revision";
    }
    const motor1 = v1.response_json?.motor1;
    if (motor1 === 2) return "rechazado";
    if (motor1 === 1) return "en_revision";
    return "pendiente";
}

function buildValidaciones(
    v1: Valida1Row,
    motor: MotorProcessRow | null,
): ValidacionItem[] {
    const resp = v1.response_json;
    const items: ValidacionItem[] = [
        { label: "Resultado Validación 1", key: "motor1", estado: norm(resp?.motor1) },
        { label: "Validación Identidad (ID)", key: "valida_id", estado: norm(resp?.valida_id) },
        { label: "Validación Email", key: "valida_email", estado: norm(resp?.valida_email) },
        { label: "Validación Celular", key: "valida_celular", estado: norm(resp?.valida_celular) },
        { label: "Validación Apellido", key: "valida_last_name", estado: norm(resp?.valida_last_name) },
        { label: "Validación Capacidad", key: "valida_capacidad", estado: norm(resp?.valida_capacidad) },
        { label: "Validación Estado Laboral", key: "valida_estado_laboral", estado: norm(resp?.valida_estado_laboral) },
    ];

    if (motor) {
        const proc = motor.response_json?.processing;
        items.push(
            { label: "Viabilidad crediticia", key: "viabilidadDef", estado: normBool(proc?.viabilidadDef) },
            { label: "Viabilidad criterio 1", key: "viabilidad1", estado: normBool(proc?.viabilidad1) },
        );
    }

    return items;
}

function buildSolicitante(v1: Valida1Row, md: MotorDataRow | null): string {
    const nombre =
        md?.response_json?.datos_asociado?.deudor ||
        v1.response_json?.datos_asociado?.nombre_completo ||
        v1.request_json?.last_name ||
        "";
    return nombre.trim() || "—";
}

function decisionTexto(v1: Valida1Row, motor: MotorProcessRow | null): string {
    if (!motor) {
        const resp = v1.response_json;
        if (resp?.motor1 === 1) return "Pendiente de motor";
        if (resp?.motor1 === 2) return resp.mensaje ?? "No apto en validación inicial";
        return "Pendiente de validación";
    }
    const resp = motor.response_json;
    if (resp?.motor2) return resp.motor2;
    return resp?.status ?? "—";
}

function extractScore(md: MotorDataRow | null): number | null {
    if (!md) return null;
    const resp = md.response_json;
    const score = resp?.detallado?.tu_score ?? resp?.datos_asociado?.scoreTU;
    return typeof score === "number" ? score : null;
}

function extractMonto(motor: MotorProcessRow | null): number {
    const monto = motor?.response_json?.oferta?.monto;
    return typeof monto === "number" && Number.isFinite(monto) ? monto : 0;
}

/** @internal */
export function parseFecha(radicado: string, fallback: string): string {
    // Formato radicado: "{cedula}_{DDMMYY}{HHMMSS}"
    const ts = radicado.split("_")[1] ?? "";
    if (ts.length >= 6 && !isNaN(Number(ts.slice(0, 6)))) {
        return `20${ts.slice(4, 6)}-${ts.slice(2, 4)}-${ts.slice(0, 2)}`;
    }
    return fallback.slice(0, 10);
}

// ─── Marcar como gestionado ───────────────────────────────────────────────────

/**
 * Marca una solicitud como gestionada.
 * Requiere columnas gestionado_at y gestionado_by en valida1_results:
 *   ALTER TABLE valida1_results ADD COLUMN IF NOT EXISTS gestionado_at timestamptz;
 *   ALTER TABLE valida1_results ADD COLUMN IF NOT EXISTS gestionado_by text;
 */
export async function marcarGestionado(
    radicado: string,
    por?: string,
): Promise<SafeResult<null>> {
    return safeCall<null>(
        async () => {
            const { error } = await supabase
                .from("valida1_results")
                .update({
                    gestionado_at: new Date().toISOString(),
                    gestionado_by: por ?? null,
                })
                .eq("radicado", radicado);
            if (error) throw error;
            return null;
        },
        { label: "bandeja.marcarGestionado", timeoutMs: 10_000 },
    );
}

// ─── Listado principal ────────────────────────────────────────────────────────

export async function listSolicitudes(
    options: ListSolicitudesOptions = {},
): Promise<SafeResult<SolicitudUI[]>> {
    const limit = options.limit ?? 200;

    return safeCall(
        async () => {
            // 1. valida1_results — universo principal, orden descendente
            let v1Query = supabase
                .from("valida1_results")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(limit);

            if (options.cedulaFilter)
                v1Query = v1Query.eq("cedula", options.cedulaFilter);

            if (options.gestionadoFilter === true)
                v1Query = v1Query.not("gestionado_at", "is", null);
            else if (options.gestionadoFilter === false)
                v1Query = v1Query.is("gestionado_at", null);

            if (options.searchPrefix) {
                // Filtra en DB registros cuya cédula o radicado empiece con el texto dado.
                // OR en PostgREST: se encadena con or()
                v1Query = v1Query.or(
                    `cedula.ilike.${options.searchPrefix}%,radicado.ilike.${options.searchPrefix}%`,
                );
            }

            const v1Res = await v1Query;
            if (v1Res.error) return { data: null as unknown as SolicitudUI[], error: v1Res.error };

            const v1Rows = (v1Res.data ?? []) as Valida1Row[];
            if (v1Rows.length === 0) return { data: [] as SolicitudUI[], error: null };

            const radicados = v1Rows.map((r) => r.radicado);

            // 2. Tablas relacionadas en paralelo — todas usan radicado como FK
            // TODO: crear una DB view `motor_data_slim` que exponga solo datos_asociado + detallado
            // para evitar transferir api_responses (puede pesar varios KB por fila).
            const [mpRes, mdRes, ivRes] = await Promise.all([
                supabase
                    .from("motor_process_results")
                    .select("*")
                    .in("radicado", radicados),
                supabase
                    .from("motor_data_results")
                    .select("*")
                    .in("radicado", radicados),
                supabase
                    .from("identity_results")
                    .select("*")
                    .in("radicado", radicados),
            ]);

            if (mpRes.error) console.warn("[bandeja] motor_process_results:", mpRes.error.message);
            if (mdRes.error) console.warn("[bandeja] motor_data_results:", mdRes.error.message);
            if (ivRes.error) console.warn("[bandeja] identity_results:", ivRes.error.message);

            // 3. Indexar por radicado para lookups O(1)
            const mpByRad = new Map<string, MotorProcessRow>(
                (mpRes.data ?? []).map((r) => [r.radicado, r as MotorProcessRow]),
            );
            const mdByRad = new Map<string, MotorDataRow>(
                (mdRes.data ?? []).map((r) => [r.radicado, r as MotorDataRow]),
            );
            const ivByRad = new Map<string, IdentityRow>(
                (ivRes.data ?? []).map((r) => [r.radicado, r as IdentityRow]),
            );

            // 4. Construir SolicitudUI[]
            const out: SolicitudUI[] = v1Rows.map((v1) => {
                const motor = mpByRad.get(v1.radicado) ?? null;
                const md = mdByRad.get(v1.radicado) ?? null;
                const iv = ivByRad.get(v1.radicado) ?? null;

                return {
                    radicado: v1.radicado,
                    cedula: v1.cedula,
                    solicitante: buildSolicitante(v1, md),
                    fecha: parseFecha(v1.radicado, v1.created_at),
                    valor: extractMonto(motor),
                    estado: deriveEstado(v1, motor),
                    score: extractScore(md),
                    decisionTexto: decisionTexto(v1, motor),
                    sinMotor: !motor,
                    gestionado: !!v1.gestionado_at,
                    gestionadoAt: v1.gestionado_at ?? null,
                    validaciones: buildValidaciones(v1, motor),
                    raw: {
                        valida1: v1,
                        motor_process: motor,
                        motor_data: md,
                        identity: iv,
                    },
                };
            });

            return { data: out, error: null };
        },
        { label: "bandeja.list", timeoutMs: 20_000 },
    );
}
