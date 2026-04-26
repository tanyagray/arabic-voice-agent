import './dev/fake-mic' // dev-only mic shim, no-op unless VITE_FAKE_MIC=1
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PostHogProvider } from 'posthog-js/react'
import { SupabaseProvider } from './context/SupabaseContext'
import { AuthProvider } from './context/AuthContext'
import { PaywallProvider } from './components/Paywall/PaywallProvider'
import { Provider } from './components/ui/provider'
import posthog from './posthog'
import './typography.css'
import './index.css'
import App from './App.tsx'

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
    mutations: {
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <PostHogProvider client={posthog}>
    <QueryClientProvider client={queryClient}>
      <Provider>
        <SupabaseProvider>
          <AuthProvider>
            <BrowserRouter>
              <PaywallProvider>
                <App />
              </PaywallProvider>
            </BrowserRouter>
          </AuthProvider>
        </SupabaseProvider>
      </Provider>
    </QueryClientProvider>
  </PostHogProvider>,
)
