import { useEffect, useState, useCallback } from 'react'
import { useParams, NavLink } from 'react-router-dom'
import { Alert, Box, Flex, Heading, Spinner, Text } from '@chakra-ui/react'
import apiClient from '../lib/api-client'

const FLOW_LABELS: Record<string, string> = {
  tutor: 'Tutor',
  onboarding: 'Onboarding',
}

type AgentSessionSummary = {
  session_id: string
  user_id: string | null
  flow: string | null
  message_count: number
  first_message_at: string
  last_message_at: string
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

export function AgentSessionsPage() {
  const { flow } = useParams<{ flow: string }>()
  const [sessions, setSessions] = useState<AgentSessionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSessions = useCallback(async () => {
    if (!flow) return
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.get<AgentSessionSummary[]>(
        `/admin/agent-sessions`,
        { params: { flow } },
      )
      setSessions(res.data)
    } catch {
      setError('Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }, [flow])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const title = `${FLOW_LABELS[flow || ''] || flow} Sessions`

  return (
    <Box p={6} h="100%" display="flex" flexDirection="column">
      <Heading size="md" mb={4}>{title}</Heading>

      {error && (
        <Alert.Root status="error" mb={3} borderRadius="md" size="sm">
          <Alert.Description>{error}</Alert.Description>
        </Alert.Root>
      )}

      {loading ? (
        <Box py={6}><Spinner size="sm" /></Box>
      ) : sessions.length === 0 ? (
        <Text fontSize="sm" color="gray.500">No sessions yet.</Text>
      ) : (
        <Box bg="white" borderRadius="md" borderWidth="1px" borderColor="gray.200" overflow="hidden">
          {sessions.map((s) => (
            <NavLink key={s.session_id} to={`/agents/${flow}/sessions/${s.session_id}`}>
              {({ isActive }) => (
                <Flex
                  px={4}
                  py={3}
                  borderBottomWidth="1px"
                  borderBottomColor="gray.100"
                  bg={isActive ? 'blue.50' : 'white'}
                  _hover={{ bg: isActive ? 'blue.50' : 'gray.50' }}
                  cursor="pointer"
                  align="center"
                  gap={4}
                >
                  <Box flex={1} minW={0}>
                    <Text fontFamily="mono" fontSize="xs" color="gray.700" truncate>
                      {s.session_id}
                    </Text>
                    {s.user_id && (
                      <Text fontFamily="mono" fontSize="xs" color="gray.500" truncate>
                        user: {s.user_id}
                      </Text>
                    )}
                  </Box>
                  <Text fontSize="xs" color="gray.600" whiteSpace="nowrap">
                    {s.message_count} msg{s.message_count === 1 ? '' : 's'}
                  </Text>
                  <Text fontSize="xs" color="gray.500" whiteSpace="nowrap">
                    {formatDate(s.last_message_at)}
                  </Text>
                </Flex>
              )}
            </NavLink>
          ))}
        </Box>
      )}
    </Box>
  )
}
