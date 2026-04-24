import React from "react"
import { ChakraProvider } from "@chakra-ui/react"
import { withThemeByClassName } from "@storybook/addon-themes"
import { MemoryRouter } from "react-router-dom"
import type { Preview } from '@storybook/react-vite'
import { SupabaseProvider } from '../src/context/SupabaseContext'
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
    (Story, context) => {
      const initialEntries = (context.parameters?.initialEntries as string[] | undefined) ?? ['/'];
      return (
        <ChakraProvider value={system}>
          <SupabaseProvider>
            <AuthProvider>
              <MemoryRouter initialEntries={initialEntries}>
                <Story />
              </MemoryRouter>
            </AuthProvider>
          </SupabaseProvider>
        </ChakraProvider>
      );
    },
    withThemeByClassName({
      defaultTheme: "light",
      themes: { light: "", dark: "dark" },
    }),
  ],
};

export default preview;
