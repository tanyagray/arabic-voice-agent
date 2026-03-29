import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { ConfigProvider } from './context/ConfigContext'
import { AuthProvider } from './context/AuthContext'
import { AuthGuard } from './components/AuthGuard'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { PromptEditPage } from './pages/PromptEditPage'
import { ChatDebugPage } from './pages/ChatDebugPage'
import { VoiceDebugPage } from './pages/VoiceDebugPage'

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
                      <Route path="/" element={<Navigate to="/prompts/base" replace />} />
                      <Route path="/prompts" element={<Navigate to="/prompts/base" replace />} />
                      <Route path="/prompts/:promptType" element={<PromptEditPage />} />
                      <Route path="/debug/chat" element={<ChatDebugPage />} />
                      <Route path="/debug/voice" element={<VoiceDebugPage />} />
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
