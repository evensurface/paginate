import { defineConfig } from "tsdown"

export default defineConfig({
  dts: {
    generator: "tsc",
    resolver: "tsc",
  },
})
