// Re-exporta los tipos que usan los componentes de bandeja
export type { SolicitudUI, SolicitudDetail, SolicitudEstado, ValidacionItem } from "./types";

// ─── Tipo de resultado genérico ───────────────────────────────────────────────

type SafeResult<T> =
  | { ok: true; data: T; error: null }
  | { ok: false; data: null; error: { message: string } };

// ─── Opciones de listado ──────────────────────────────────────────────────────

export interface ListSolicitudesOptions {
  limit?: number;
  cedulaFilter?: string;
}

// ─── Cliente HTTP — llama a /api/usuario/bandeja ──────────────────────────────

import type { SolicitudUI } from "./types";

async function listSolicitudes(
  options: ListSolicitudesOptions = {},
): Promise<SafeResult<SolicitudUI[]>> {
  try {
    const params = new URLSearchParams();
    if (options.limit)       params.set("limit",        String(options.limit));
    if (options.cedulaFilter) params.set("cedulaFilter", options.cedulaFilter);

    const res  = await fetch(`/api/usuario/bandeja?${params.toString()}`);
    const json = await res.json() as { ok: boolean; data?: SolicitudUI[]; message?: string };

    if (!res.ok || !json.ok) {
      return { ok: false, data: null, error: { message: json.message ?? "Error al cargar solicitudes." } };
    }
    return { ok: true, data: json.data ?? [], error: null };
  } catch (err) {
    return { ok: false, data: null, error: { message: err instanceof Error ? err.message : "Error de conexión." } };
  }
}

async function marcarGestionado(
  radicado: string,
  _por?: string,
): Promise<SafeResult<null>> {
  try {
    const res  = await fetch("/api/usuario/bandeja", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ radicado }),
    });
    const json = await res.json() as { ok: boolean; message?: string };

    if (!res.ok || !json.ok) {
      return { ok: false, data: null, error: { message: json.message ?? "Error al gestionar." } };
    }
    return { ok: true, data: null, error: null };
  } catch (err) {
    return { ok: false, data: null, error: { message: err instanceof Error ? err.message : "Error de conexión." } };
  }
}

async function getSolicitud(radicado: string): Promise<SafeResult<SolicitudUI>> {
  try {
    const res  = await fetch(`/api/usuario/bandeja/${encodeURIComponent(radicado)}`);
    const json = await res.json() as { ok: boolean; data?: SolicitudUI; message?: string };
    if (!res.ok || !json.ok) {
      return { ok: false, data: null, error: { message: json.message ?? "Error al cargar solicitud." } };
    }
    return { ok: true, data: json.data!, error: null };
  } catch (err) {
    return { ok: false, data: null, error: { message: err instanceof Error ? err.message : "Error de conexión." } };
  }
}

export const bandeja = { listSolicitudes, marcarGestionado, getSolicitud };
