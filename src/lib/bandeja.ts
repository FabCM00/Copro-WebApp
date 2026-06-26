// Re-exporta los tipos que usan los componentes de bandeja
export type {
  SolicitudUI,
  SolicitudDetail,
  SolicitudEstado,
  ValidacionItem,
} from "./types";

import type { SolicitudUI } from "./types";

type SafeResult<T> =
  | { ok: true; data: T; error: null }
  | { ok: false; data: null; error: { message: string } };

export interface ListSolicitudesOptions {
  limit?: number;
  page?: number;
  cedulaFilter?: string;
  q?: string;
  gestionado?: boolean;
}

export interface SolicitudesPage {
  data: SolicitudUI[];
  total: number;
  totalPages: number;
  page: number;
  totalActivas: number;
  totalGestionadas: number;
}

async function listSolicitudes(
  options: ListSolicitudesOptions = {},
): Promise<SafeResult<SolicitudesPage>> {
  try {
    const params = new URLSearchParams();
    if (options.limit !== undefined) params.set("limit", String(options.limit));
    if (options.page  !== undefined) params.set("page",  String(options.page));
    if (options.cedulaFilter)        params.set("cedulaFilter", options.cedulaFilter);
    if (options.q)                   params.set("q",    options.q);
    if (options.gestionado !== undefined)
      params.set("gestionado", String(options.gestionado));

    const res  = await fetch(`/api/usuario/bandeja?${params.toString()}`);
    const json = (await res.json()) as {
      ok: boolean;
      data?: SolicitudUI[];
      total?: number;
      totalPages?: number;
      page?: number;
      totalActivas?: number;
      totalGestionadas?: number;
      message?: string;
    };

    if (!res.ok || !json.ok) {
      return {
        ok: false,
        data: null,
        error: { message: json.message ?? "Error al cargar solicitudes." },
      };
    }

    return {
      ok: true,
      data: {
        data:             json.data             ?? [],
        total:            json.total            ?? 0,
        totalPages:       json.totalPages       ?? 1,
        page:             json.page             ?? 1,
        totalActivas:     json.totalActivas     ?? 0,
        totalGestionadas: json.totalGestionadas ?? 0,
      },
      error: null,
    };
  } catch (err) {
    return {
      ok: false,
      data: null,
      error: {
        message: err instanceof Error ? err.message : "Error de conexión.",
      },
    };
  }
}

async function marcarGestionado(
  radicado: string,
  _por?: string,
): Promise<SafeResult<null>> {
  try {
    const res = await fetch("/api/usuario/bandeja", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ radicado }),
    });
    const json = (await res.json()) as { ok: boolean; message?: string };

    if (!res.ok || !json.ok) {
      return {
        ok: false,
        data: null,
        error: { message: json.message ?? "Error al gestionar." },
      };
    }
    return { ok: true, data: null, error: null };
  } catch (err) {
    return {
      ok: false,
      data: null,
      error: {
        message: err instanceof Error ? err.message : "Error de conexión.",
      },
    };
  }
}

async function getSolicitud(
  radicado: string,
): Promise<SafeResult<SolicitudUI>> {
  try {
    const res = await fetch(
      `/api/usuario/bandeja/${encodeURIComponent(radicado)}`,
    );
    const json = (await res.json()) as {
      ok: boolean;
      data?: SolicitudUI;
      message?: string;
    };
    if (!res.ok || !json.ok) {
      return {
        ok: false,
        data: null,
        error: { message: json.message ?? "Error al cargar solicitud." },
      };
    }
    return { ok: true, data: json.data!, error: null };
  } catch (err) {
    return {
      ok: false,
      data: null,
      error: {
        message: err instanceof Error ? err.message : "Error de conexión.",
      },
    };
  }
}

export const bandeja = { listSolicitudes, marcarGestionado, getSolicitud };
