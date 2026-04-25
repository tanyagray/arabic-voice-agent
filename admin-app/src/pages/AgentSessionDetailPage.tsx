import { useEffect, useState, useCallback } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import { Alert, Badge, Box, Flex, Heading, Spinner, Text } from '@chakra-ui/react'
import apiClient from '../lib/api-client'

type TranscriptMessage = {
  message_id: string
  session_id: string
  user_id: string
  message_source: string
  message_kind: string
  message_text: string
  message_text_canonical: string | null
  message_text_scaffolded: string | null
  message_text_transliterated: string | null
  highlights: unknown[]
  flow: string | null
  node: string | null
  created_at: string
  updated_at: string
}

const SOURCE_COLORS: Record<string, string> = {
  user: 'blue',
  tutor: 'green',
  system: 'gray',
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

export function AgentSessionDetailPage() {
  const { flow, sessionId } = useParams<{ flow: string; sessionId: string }>()
  const [messages, setMessages] = useState<TranscriptMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMessages = useCallback(async () => {
    if (!sessionId) return
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.get<TranscriptMessage[]>(
        `/admin/agent-sessions/${sessionId}/messages`,
      )
      setMessages(res.data)
    } catch {
      setError('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  return (
    <Box p={6} h="100%" display="flex" flexDirection="column">
      <Flex align="center" gap={3} mb={4}>
        <RouterLink to={`/agents/${flow}/sessions`}>
          <Text fontSize="sm" color="blue.600">← Back to sessions</Text>
        </RouterLink>
      </Flex>
      <Heading size="md" mb={1}>Session</Heading>
      <Text fontFamily="mono" fontSize="xs" color="gray.600" mb={4}>{sessionId}</Text>

      {error && (
        <Alert.Root status="error" mb={3} borderRadius="md" size="sm">
          <Alert.Description>{error}</Alert.Description>
        </Alert.Root>
      )}

      {loading ? (
        <Box py={6}><Spinner size="sm" /></Box>
      ) : messages.length === 0 ? (
        <Text fontSize="sm" color="gray.500">No messages in this session.</Text>
      ) : (
        <Box display="flex" flexDirection="column" gap={3}>
          {messages.map((m) => {
            const isUser = m.message_source === 'user'
            return (
              <Box
                key={m.message_id}
                alignSelf={isUser ? 'flex-end' : 'flex-start'}
                maxW="75%"
                bg={isUser ? 'blue.50' : m.message_source === 'system' ? 'gray.100' : 'white'}
                borderWidth="1px"
                borderColor="gray.200"
                borderRadius="md"
                px={4}
                py={3}
              >
                <Flex align="center" gap={2} mb={1}>
                  <Badge size="sm" colorPalette={SOURCE_COLORS[m.message_source] || 'gray'}>
                    {m.message_source}
                  </Badge>
                  {m.node && (
                    <Badge size="sm" variant="outline">{m.node}</Badge>
                  )}
                  <Text fontSize="xs" color="gray.500" ml="auto">
                    {formatDate(m.created_at)}
                  </Text>
                </Flex>
                <Text fontSize="sm" whiteSpace="pre-wrap">{m.message_text}</Text>
                {m.message_text_canonical && m.message_text_canonical !== m.message_text && (
                  <Text fontSize="xs" color="gray.500" mt={2} dir="rtl">
                    {m.message_text_canonical}
                  </Text>
                )}
              </Box>
            )
          })}
        </Box>
      )}
    </Box>
  )
}
