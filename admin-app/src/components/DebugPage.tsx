import { useState, useRef, useEffect, type FormEvent } from 'react'
import {
  Box, Button, Flex, Heading, Input, NativeSelect,
  Text, VStack, Badge, Spinner, Tabs
} from '@chakra-ui/react'
import JsonView from '@uiw/react-json-view'
import { githubLightTheme } from '@uiw/react-json-view/githubLight'
import apiClient from '../lib/api-client'

const LANGUAGES = ['ar-AR', 'ar-IQ', 'es-MX', 'ru-RU', 'mi-NZ']

interface ChatMessage {
  role: 'user' | 'agent'
  text: string
  textCanonical?: string
}

interface Phase2Response {
  text: string
  model: string
  usage: Record<string, unknown>
  raw_output: string
}

interface LlmResponse {
  text: string
  text_canonical: string | null
  messages: unknown[]
  raw_responses: unknown[]
  phase2_response: Phase2Response | null
  usage: Record<string, unknown> | null
}

type ResponseMode = 'scaffolded' | 'transliterated'

const RESPONSE_MODES: { value: ResponseMode; label: string }[] = [
  { value: 'scaffolded', label: 'Scaffolded' },
  { value: 'transliterated', label: 'Transliterated' },
]

interface DebugPageProps {
  title: string
  defaultResponseMode?: ResponseMode
}

export function DebugPage({ title, defaultResponseMode = 'scaffolded' }: DebugPageProps) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [language, setLanguage] = useState('ar-AR')
  const [responseMode, setResponseMode] = useState<ResponseMode>(defaultResponseMode)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [lastResponse, setLastResponse] = useState<LlmResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function createSession(): Promise<string> {
    const res = await apiClient.post<{ session_id: string }>('/admin/sessions')
    const id = res.data.session_id
    setSessionId(id)
    await apiClient.patch(`/admin/sessions/${id}/context`, { language, response_mode: responseMode })
    return id
  }

  function handleNewSession() {
    setMessages([])
    setLastResponse(null)
    setError(null)
    setSessionId(null)
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    if (!input.trim()) return

    const userText = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text: userText }])
    setSending(true)
    setError(null)

    try {
      let sid = sessionId
      if (!sid) {
        sid = await createSession()
      }

      const res = await apiClient.post<LlmResponse>(`/admin/sessions/${sid}/chat`, {
        message: userText,
      })
      setMessages((prev) => [...prev, {
        role: 'agent',
        text: res.data.text,
        textCanonical: res.data.text_canonical ?? undefined,
      }])
      setLastResponse(res.data)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Request failed'
      setError(msg)
    } finally {
      setSending(false)
    }
  }

  async function handleLanguageChange(lang: string) {
    setLanguage(lang)
    if (sessionId) {
      await apiClient.patch(`/admin/sessions/${sessionId}/context`, { language: lang })
    }
  }

  async function handleResponseModeChange(mode: ResponseMode) {
    setResponseMode(mode)
    if (sessionId) {
      await apiClient.patch(`/admin/sessions/${sessionId}/context`, { response_mode: mode })
    }
  }

  const phase2Label = responseMode === 'transliterated' ? 'Transliteration' : 'Scaffolding'

  return (
    <Box p={6} h="100%" display="flex" flexDirection="column">
      <Heading size="md" mb={4}>{title}</Heading>
      <Flex gap={4} flex={1} overflow="hidden">

        {/* Chat panel */}
        <Flex direction="column" flex={1} bg="white" border="1px solid" borderColor="gray.200" borderRadius="lg" overflow="hidden">
          {/* Controls */}
          <Flex p={3} gap={2} borderBottom="1px solid" borderColor="gray.100" align="center">
            <NativeSelect.Root size="sm" w="150px">
              <NativeSelect.Field
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
              >
                {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
              </NativeSelect.Field>
            </NativeSelect.Root>
            <NativeSelect.Root size="sm" w="160px">
              <NativeSelect.Field
                value={responseMode}
                onChange={(e) => handleResponseModeChange(e.target.value as ResponseMode)}
              >
                {RESPONSE_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </NativeSelect.Field>
            </NativeSelect.Root>
            <Button size="sm" variant="outline" onClick={handleNewSession}>New Session</Button>
            {sessionId && <Badge colorPalette="green" fontSize="xs">Session active</Badge>}
          </Flex>

          {/* Messages */}
          <VStack
            flex={1}
            overflowY="auto"
            p={4}
            gap={3}
            align="stretch"
          >
            {messages.length === 0 && (
              <Text color="gray.400" fontSize="sm" textAlign="center" mt={8}>
                Send a message to start a session
              </Text>
            )}
            {messages.map((msg, i) => (
              <Flex key={i} justify={msg.role === 'user' ? 'flex-end' : 'flex-start'}>
                <Box maxW="75%">
                  <Box
                    px={3}
                    py={2}
                    borderRadius="lg"
                    bg={msg.role === 'user' ? 'blue.500' : 'gray.100'}
                    color={msg.role === 'user' ? 'white' : 'gray.800'}
                    fontSize="sm"
                  >
                    {msg.text}
                  </Box>
                  {msg.role === 'agent' && msg.textCanonical && (
                    <Text fontSize="xs" color="gray.500" mt={1} px={1} dir="rtl">
                      {msg.textCanonical}
                    </Text>
                  )}
                </Box>
              </Flex>
            ))}
            {sending && (
              <Flex justify="flex-start">
                <Box px={3} py={2} bg="gray.100" borderRadius="lg">
                  <Spinner size="xs" />
                </Box>
              </Flex>
            )}
            {error && <Text color="red.500" fontSize="sm">{error}</Text>}
            <div ref={messagesEndRef} />
          </VStack>

          {/* Input */}
          <Box p={3} borderTop="1px solid" borderColor="gray.100">
            <form onSubmit={handleSend}>
              <Flex gap={2}>
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message…"
                  size="sm"
                  disabled={sending}
                />
                <Button type="submit" colorPalette="blue" size="sm" loading={sending}>
                  Send
                </Button>
              </Flex>
            </form>
          </Box>
        </Flex>

        {/* Response inspector */}
        <Flex
          direction="column"
          flex={1}
          bg="white"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="lg"
          overflow="hidden"
        >
          <Box p={3} borderBottom="1px solid" borderColor="gray.100">
            <Text fontWeight="semibold" fontSize="sm">LLM Response Inspector</Text>
          </Box>

          {!lastResponse ? (
            <Box flex={1} display="flex" alignItems="center" justifyContent="center">
              <Text color="gray.400" fontSize="sm">No response yet</Text>
            </Box>
          ) : (
            <Box flex={1} overflow="hidden">
              <Tabs.Root defaultValue="phase1" h="100%" display="flex" flexDirection="column">
                <Tabs.List px={3} borderBottom="1px solid" borderColor="gray.100">
                  <Tabs.Trigger value="phase1">Phase 1: Agent</Tabs.Trigger>
                  <Tabs.Trigger value="phase2">Phase 2: {phase2Label}</Tabs.Trigger>
                  <Tabs.Trigger value="messages">Messages</Tabs.Trigger>
                  <Tabs.Trigger value="usage">Usage</Tabs.Trigger>
                </Tabs.List>

                <Box flex={1} overflow="auto">
                  <Tabs.Content value="phase1" p={3}>
                    <Text fontWeight="semibold" fontSize="xs" mb={2} color="gray.600">
                      Agent SDK raw responses ({lastResponse.raw_responses.length} call{lastResponse.raw_responses.length !== 1 ? 's' : ''})
                    </Text>
                    <JsonView value={lastResponse.raw_responses} style={githubLightTheme} displayDataTypes={false} collapsed={2} />
                  </Tabs.Content>
                  <Tabs.Content value="phase2" p={3}>
                    {lastResponse.phase2_response ? (
                      <>
                        <Text fontWeight="semibold" fontSize="xs" mb={2} color="gray.600">
                          {phase2Label} response (model: {lastResponse.phase2_response.model})
                        </Text>
                        <JsonView value={lastResponse.phase2_response} style={githubLightTheme} displayDataTypes={false} collapsed={2} />
                      </>
                    ) : (
                      <Text color="gray.400" fontSize="sm">No phase 2 response</Text>
                    )}
                  </Tabs.Content>
                  <Tabs.Content value="messages" p={3}>
                    <JsonView value={lastResponse.messages} style={githubLightTheme} displayDataTypes={false} collapsed={2} />
                  </Tabs.Content>
                  <Tabs.Content value="usage" p={3}>
                    <Text fontWeight="semibold" fontSize="xs" mb={2} color="gray.600">
                      Phase 1: Agent SDK
                    </Text>
                    <JsonView value={lastResponse.usage ?? {}} style={githubLightTheme} displayDataTypes={false} />
                    {lastResponse.phase2_response?.usage && (
                      <Box mt={4}>
                        <Text fontWeight="semibold" fontSize="xs" mb={2} color="gray.600">
                          Phase 2: {phase2Label}
                        </Text>
                        <JsonView value={lastResponse.phase2_response.usage} style={githubLightTheme} displayDataTypes={false} />
                      </Box>
                    )}
                  </Tabs.Content>
                </Box>
              </Tabs.Root>
            </Box>
          )}
        </Flex>
      </Flex>
    </Box>
  )
}
