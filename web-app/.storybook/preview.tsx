import React from "react"
import { ChakraProvider } from "@chakra-ui/react"
import { withThemeByClassName } from "@storybook/addon-themes"
import { MemoryRouter } from "react-router-dom"
import type { Preview } from '@storybook/react-vite'
import { AuthProvider } from '../src/context/AuthContext'
import { system } from '../src/theme'
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
          <ChakraProvider value={system}>
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
