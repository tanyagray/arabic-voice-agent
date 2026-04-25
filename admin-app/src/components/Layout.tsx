import { useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Box, Flex, VStack, Text, Button, Separator } from '@chakra-ui/react'
import { useAuth } from '../context/AuthContext'

type LeafItem = { label: string; path: string; matchPrefix?: string }
type AgentDef = { key: string; label: string; items: LeafItem[] }

const AGENTS: AgentDef[] = [
  {
    key: 'tutor',
    label: 'Tutor',
    items: [
      { label: 'Base Prompt', path: '/prompts/base' },
      { label: 'Scaffolding Prompt', path: '/prompts/scaffolding' },
      { label: 'Transliteration Prompt', path: '/prompts/transliteration' },
      { label: 'Sessions', path: '/agents/tutor/sessions', matchPrefix: '/agents/tutor/sessions' },
    ],
  },
  {
    key: 'onboarding',
    label: 'Onboarding',
    items: [
      { label: 'Prompt', path: '/prompts/onboarding' },
      { label: 'Sessions', path: '/agents/onboarding/sessions', matchPrefix: '/agents/onboarding/sessions' },
    ],
  },
]

const OTHER_NAV_ITEMS = [
  { label: 'Chat Debug', path: '/debug/chat' },
  { label: 'Voice Debug', path: '/debug/voice' },
]

function pathMatches(pathname: string, target: string): boolean {
  return pathname === target || pathname.startsWith(target + '/')
}

function agentIsActive(pathname: string, agent: AgentDef): boolean {
  return agent.items.some((i) => pathMatches(pathname, i.matchPrefix ?? i.path))
}

export function Layout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const isAgentsActive = AGENTS.some((a) => agentIsActive(location.pathname, a))
  const [agentsOpen, setAgentsOpen] = useState(isAgentsActive)
  const [openAgents, setOpenAgents] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(AGENTS.map((a) => [a.key, agentIsActive(location.pathname, a)]))
  )

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  function handleAgentsClick() {
    if (!agentsOpen) {
      setAgentsOpen(true)
      const first = AGENTS[0]
      if (first) {
        setOpenAgents((s) => ({ ...s, [first.key]: true }))
        navigate(first.items[0].path)
      }
    } else {
      setAgentsOpen(false)
    }
  }

  function handleAgentClick(agent: AgentDef) {
    const wasOpen = !!openAgents[agent.key]
    setOpenAgents((s) => ({ ...s, [agent.key]: !wasOpen }))
    if (!wasOpen) {
      navigate(agent.items[0].path)
    }
  }

  return (
    <Flex h="100vh" overflow="hidden">
      <Box w="220px" bg="gray.900" color="white" p={4} flexShrink={0} display="flex" flexDirection="column">
        <Text fontWeight="bold" fontSize="lg" mb={6}>Admin</Text>
        <VStack align="stretch" gap={1} flex={1}>
          {/* Agents group */}
          <Box
            px={3}
            py={2}
            borderRadius="md"
            bg={isAgentsActive && !agentsOpen ? 'blue.600' : 'transparent'}
            _hover={{ bg: isAgentsActive ? undefined : 'gray.700' }}
            cursor="pointer"
            fontSize="sm"
            fontWeight="semibold"
            onClick={handleAgentsClick}
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            Agents
            <Text fontSize="xs" color="gray.400">{agentsOpen ? '▾' : '▸'}</Text>
          </Box>

          {agentsOpen && (
            <VStack align="stretch" gap={0} pl={3}>
              {AGENTS.map((agent) => {
                const active = agentIsActive(location.pathname, agent)
                const isOpen = !!openAgents[agent.key]
                return (
                  <Box key={agent.key}>
                    <Box
                      px={3}
                      py={1.5}
                      borderRadius="md"
                      bg={active && !isOpen ? 'blue.600' : 'transparent'}
                      _hover={{ bg: active && !isOpen ? undefined : 'gray.700' }}
                      cursor="pointer"
                      fontSize="sm"
                      fontWeight="semibold"
                      onClick={() => handleAgentClick(agent)}
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      {agent.label}
                      <Text fontSize="xs" color="gray.400">{isOpen ? '▾' : '▸'}</Text>
                    </Box>
                    {isOpen && (
                      <VStack align="stretch" gap={0} pl={3}>
                        {agent.items.map((item) => {
                          const itemActive = pathMatches(
                            location.pathname,
                            item.matchPrefix ?? item.path,
                          )
                          return (
                            <NavLink key={item.path} to={item.path} end={!item.matchPrefix}>
                              {() => (
                                <Box
                                  px={3}
                                  py={1.5}
                                  borderRadius="md"
                                  bg={itemActive ? 'blue.600' : 'transparent'}
                                  _hover={{ bg: itemActive ? 'blue.600' : 'gray.700' }}
                                  cursor="pointer"
                                  fontSize="sm"
                                >
                                  {item.label}
                                </Box>
                              )}
                            </NavLink>
                          )
                        })}
                      </VStack>
                    )}
                  </Box>
                )
              })}
            </VStack>
          )}

          {OTHER_NAV_ITEMS.map((item) => (
            <NavLink key={item.path} to={item.path}>
              {({ isActive }) => (
                <Box
                  px={3}
                  py={2}
                  borderRadius="md"
                  bg={isActive ? 'blue.600' : 'transparent'}
                  _hover={{ bg: isActive ? 'blue.600' : 'gray.700' }}
                  cursor="pointer"
                  fontSize="sm"
                >
                  {item.label}
                </Box>
              )}
            </NavLink>
          ))}
        </VStack>
        <Separator borderColor="gray.700" my={4} />
        <Button size="sm" variant="ghost" colorPalette="white" onClick={handleSignOut}>
          Sign Out
        </Button>
      </Box>

      <Box flex={1} overflow="auto" bg="gray.50">
        {children}
      </Box>
    </Flex>
  )
}
