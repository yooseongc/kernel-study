import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
    plugins: [react(), tailwindcss()],
    base: '/kernel-study/',
    resolve: {
        alias: {
            '@study-ui/components': path.resolve(__dirname, 'lib/study-ui-lib/packages/ui/src/index.ts'),
        },
    },
    build: {
        rollupOptions: {
            output: {
                // Rolldown UTF-8 boundary 버그 우회: codeSnippets를 별도 chunk로 분리
                manualChunks(id) {
                    if (id.includes('codeSnippets') || id.includes('chartData')) {
                        return 'code-snippets'
                    }
                },
            },
        },
    },
})
