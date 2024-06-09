import { defineBuildConfig } from "unbuild"

export default defineBuildConfig({
    entries: [
        'src/transform',
        'src/vitePlugin'
    ],
    clean: true,
    declaration: true,
    externals: [
        'vite'
    ],
    rollup: {
        emitCJS: true,
    }
})