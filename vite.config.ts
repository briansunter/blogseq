import reactPlugin from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import logseqDevPlugin from "vite-plugin-logseq";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    // Only apply logseq plugin in non-Storybook mode
    // Storybook uses middleware mode which is incompatible with this plugin
    ...(process.env.STORYBOOK ? [] : [logseqDevPlugin()]),
    reactPlugin(),
  ],
  // Makes HMR available for development
  build: {
    target: "esnext",
    minify: "esbuild",
  },
});
