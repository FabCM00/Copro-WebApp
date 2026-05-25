import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rutas que requieren sesión activa
const PROTECTED_PREFIXES = ["/admin", "/usuario"];

// Rutas que NO deben ser accesibles si ya hay sesión
const AUTH_ONLY_ROUTES = ["/login", "/forgot-password"];

export async function middleware(req: NextRequest) {
    const res = NextResponse.next();

    // createMiddlewareClient lee y refresca la sesión desde las cookies de la request.
    // Cualquier cookie actualizada (token renovado) se propaga al response automáticamente.
    const supabase = createMiddlewareClient({ req, res });

    const {
        data: { session },
    } = await supabase.auth.getSession();

    const { pathname } = req.nextUrl;

    const isProtected = PROTECTED_PREFIXES.some((prefix) =>
        pathname.startsWith(prefix),
    );
    const isAuthOnly = AUTH_ONLY_ROUTES.some((route) =>
        pathname.startsWith(route),
    );

    // Usuario sin sesión intenta acceder a ruta protegida → /login
    if (isProtected && !session) {
        const loginUrl = req.nextUrl.clone();
        loginUrl.pathname = "/login";
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Usuario con sesión activa intenta acceder a login/forgot-password → bandeja
    // El hook useProtectedRoute en el cliente maneja la redirección por rol.
    if (isAuthOnly && session) {
        const bandejaUrl = req.nextUrl.clone();
        bandejaUrl.pathname = "/usuario/bandeja";
        bandejaUrl.search = "";
        return NextResponse.redirect(bandejaUrl);
    }

    return res;
}

export const config = {
    matcher: [
        // Excluir assets estáticos, imágenes y archivos de Next.js internos
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)",
    ],
};
