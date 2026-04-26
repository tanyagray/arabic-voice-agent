import React from "react"
import { ChakraProvider } from "@chakra-ui/react"
import { withThemeByClassName } from "@storybook/addon-themes"
import { MemoryRouter } from "react-router-dom"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Preview } from '@storybook/react-vite'
import { SupabaseProvider } from '../src/context/SupabaseContext'
import { AuthProvider } from '../src/context/AuthContext'
import { system } from '../src/theme'
import '../src/index.css'

// Stub /config so SupabaseProvider resolves without a running web-api.
const realFetch = window.fetch.bind(window)
window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
  if (url.endsWith('/config')) {
    return Promise.resolve(new Response(JSON.stringify({
      supabase_url: 'http://localhost:54321',
      supabase_publishable_key: 'storybook-publishable-key',
      posthog_key: '',
      posthog_host: '',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
  }
  return realFetch(input, init)
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: Infinity },
  },
})

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
          <QueryClientProvider client={queryClient}>
            <SupabaseProvider>
              <AuthProvider>
                <MemoryRouter initialEntries={initialEntries}>
                  <Story />
                </MemoryRouter>
              </AuthProvider>
            </SupabaseProvider>
          </QueryClientProvider>
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
