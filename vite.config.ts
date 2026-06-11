// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // The Lovable config wrapper already includes the nitro/vite plugin — do NOT
  // add a second `nitro()` plugin manually (it breaks with duplicate plugins).
  // Force nitro on and pin the Vercel preset for self-deploys to Vercel.
  // Note: inside a Lovable build the preset is forced to Cloudflare; this
  // `vercel` preset applies when you build/deploy from your own Vercel CI.
  nitro: { preset: "vercel" },
});
