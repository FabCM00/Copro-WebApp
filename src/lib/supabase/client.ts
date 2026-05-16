import { createClient } from "@supabase/supabase-js";

let _capturedHash = "";
if (typeof window !== "undefined") {
    const h = window.location.hash || "";
    if (
        h &&
        (h.includes("access_token") ||
            h.includes("type=invite") ||
            h.includes("type=signup") ||
            h.includes("type=recovery") ||
            h.includes("type=magiclink"))
    ) {
        _capturedHash = h;
        try {
            window.history.replaceState(null, "", window.location.pathname + window.location.search);
        } catch {
            /* replaceState raramente falla */
        }
    }
}

export const CAPTURED_AUTH_HASH = _capturedHash;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Cliente aislado por pestaña: usa sessionStorage en lugar de localStorage.
// Cualquier operación de auth que haga este cliente (signOut, setSession, etc.)
// SOLO afecta a la pestaña actual. Se usa exclusivamente en el flujo de
// invitación (set-password) para que no pise la sesión del admin en otras pestañas.
const tabStorage =
    typeof window !== "undefined"
        ? {
              getItem: (key: string) => window.sessionStorage.getItem(key),
              setItem: (key: string, value: string) => window.sessionStorage.setItem(key, value),
              removeItem: (key: string) => window.sessionStorage.removeItem(key),
          }
        : undefined;

export const supabaseIsolated = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: tabStorage,
        storageKey: "sb-invite-auth",
        persistSession: true,
        autoRefreshToken: true,
    },
});

export const SUPABASE_URL = supabaseUrl;
export const SUPABASE_ANON_KEY = supabaseAnonKey;
