import React from "react"
import { ChakraProvider, defaultSystem } from "@chakra-ui/react"
import { withThemeByClassName } from "@storybook/addon-themes"
import { MemoryRouter } from "react-router-dom"
import type { Preview } from '@storybook/react-vite'
import { AuthProvider } from '../src/contexts/AuthContext'
import '../src/index.css'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    options: {
      storySort: {
        order: ['Pages', 'Components', 'Atoms'],
      },
    },
    backgrounds: {},
    a11y: {
      test: "todo"
    }
  },
  initialGlobals: {
    backgrounds: {
      value: 'dark'
    }
  },
  decorators: [
    (Story) => (
      <AuthProvider>
        <MemoryRouter>
          <ChakraProvider value={defaultSystem}>
            <Story />
          </ChakraProvider>
        </MemoryRouter>
      </AuthProvider>
    ),
    withThemeByClassName({
      defaultTheme: "light",
      themes: { light: "", dark: "dark" },
    }),
  ],
};

export default preview;
