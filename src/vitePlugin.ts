import type { Plugin } from "vite"
import { moduleName, transformCode } from "./transform"

export default function typeTransformPlugin(): Plugin {

  return {
    name: "type-transform-utils",
    enforce: "pre",
    transform(code, id) {
      if (code.includes(moduleName)) {
        const { code: newCode, depFiles } = transformCode(id, code)
        for (const depFile of depFiles) {
          this.addWatchFile(depFile)
        }
        return newCode
      }
    },
  }
}