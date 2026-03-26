import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { ConfigProvider } from './context/ConfigContext'
import { AuthProvider } from './context/AuthContext'
import { AuthGuard } from './components/AuthGuard'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { PromptsPage } from './pages/PromptsPage'
import { PromptEditPage } from './pages/PromptEditPage'
import { TestAgentPage } from './pages/TestAgentPage'

function App() {
  return (
    <ChakraProvider value={defaultSystem}>
      <ConfigProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <AuthGuard>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Navigate to="/prompts" replace />} />
                      <Route path="/prompts" element={<PromptsPage />} />
                      <Route path="/prompts/:language" element={<PromptEditPage />} />
                      <Route path="/test" element={<TestAgentPage />} />
                    </Routes>
                  </Layout>
                </AuthGuard>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
      </ConfigProvider>
    </ChakraProvider>
  )
}

export default App
