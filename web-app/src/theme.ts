import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react"

const config = defineConfig({
    theme: {
        tokens: {
            colors: {
                primary: {
                    50: { value: "#f0fdfa" },
                    100: { value: "#ccfbf1" },
                    200: { value: "#99f6e4" },
                    300: { value: "#5eead4" },
                    400: { value: "#2dd4bf" },
                    500: { value: "#14b8a6" },
                    600: { value: "#0d9488" },
                    700: { value: "#0f766e" },
                    800: { value: "#115e59" },
                    900: { value: "#134e4a" },
                },
                accent: {
                    50: { value: "#fffbeb" },
                    100: { value: "#fef3c7" },
                    200: { value: "#fde68a" },
                    300: { value: "#fcd34d" },
                    400: { value: "#fbbf24" },
                    500: { value: "#f59e0b" },
                    600: { value: "#d97706" },
                    700: { value: "#b45309" },
                    800: { value: "#92400e" },
                    900: { value: "#78350f" },
                },
            },
            fonts: {
                heading: { value: "'Inter var', system-ui, sans-serif" },
                body: { value: "'Inter var', system-ui, sans-serif" },
            },
        },
    },
})

export const system = createSystem(defaultConfig, config)
