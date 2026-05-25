import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
    : "*.supabase.co";

const csp = [
    "default-src 'self'",
    // Next.js requiere unsafe-inline/unsafe-eval para HMR y chunks en runtime
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    // data: para blobs de CSV export; i.imgur.com para favicon externo
    `img-src 'self' data: blob: https://i.imgur.com https://${supabaseHost}`,
    "font-src 'self'",
    // WebSocket (wss:) para Supabase Realtime; self para route handlers
    `connect-src 'self' https://${supabaseHost} wss://${supabaseHost}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    // Clickjacking – más estricto que SAMEORIGIN
                    { key: "X-Frame-Options", value: "DENY" },
                    // MIME sniffing
                    { key: "X-Content-Type-Options", value: "nosniff" },
                    // XSS filter legacy (IE/Edge)
                    { key: "X-XSS-Protection", value: "1; mode=block" },
                    // No enviar Referer a orígenes cruzados
                    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                    // Deshabilitar funcionalidades de browser no usadas
                    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
                    // HSTS – fuerza HTTPS por 2 años con subdomains (solo aplica en prod)
                    {
                        key: "Strict-Transport-Security",
                        value: "max-age=63072000; includeSubDomains; preload",
                    },
                    // CSP – restringe fuentes de scripts, estilos, imágenes y conexiones
                    { key: "Content-Security-Policy", value: csp },
                ],
            },
        ];
    },
};

export default nextConfig;
