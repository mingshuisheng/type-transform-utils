import type { Plugin } from "vite"
import { moduleName, transformCode } from "./transform"

export default function TypeToKeyArrPlugin(): Plugin {

  return {
    name: "type-transform-utils",
    enforce: "pre",
    transform(code, id, options) {
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