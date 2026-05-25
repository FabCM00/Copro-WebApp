import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
    test: {
        environment: "node",
        globals: true,
        include: ["src/**/*.test.ts"],
        coverage: {
            provider: "v8",
            include: ["src/lib/**", "src/hooks/**"],
            exclude: ["src/lib/supabase/client.ts", "src/lib/supabase/server.ts"],
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});
