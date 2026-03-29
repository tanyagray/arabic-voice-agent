import { useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Box, Flex, VStack, Text, Button, Separator } from '@chakra-ui/react'
import { useAuth } from '../context/AuthContext'

const PROMPT_ITEMS = [
  { label: 'Base Prompt', path: '/prompts/base' },
  { label: 'Scaffolding Prompt', path: '/prompts/scaffolding' },
  { label: 'Transliteration Prompt', path: '/prompts/transliteration' },
]

const OTHER_NAV_ITEMS = [
  { label: 'Chat Debug', path: '/debug/chat' },
  { label: 'Voice Debug', path: '/debug/voice' },
]

export function Layout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isPromptsActive = location.pathname.startsWith('/prompts')
  const [promptsOpen, setPromptsOpen] = useState(isPromptsActive)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  function handlePromptsClick() {
    if (!promptsOpen) {
      setPromptsOpen(true)
      navigate('/prompts/base')
    } else {
      setPromptsOpen(false)
    }
  }

  return (
    <Flex h="100vh" overflow="hidden">
      {/* Sidebar */}
      <Box w="220px" bg="gray.900" color="white" p={4} flexShrink={0} display="flex" flexDirection="column">
        <Text fontWeight="bold" fontSize="lg" mb={6}>Admin</Text>
        <VStack align="stretch" gap={1} flex={1}>
          {/* Prompts group */}
          <Box
            px={3}
            py={2}
            borderRadius="md"
            bg={isPromptsActive && !promptsOpen ? 'blue.600' : 'transparent'}
            _hover={{ bg: isPromptsActive ? undefined : 'gray.700' }}
            cursor="pointer"
            fontSize="sm"
            fontWeight="semibold"
            onClick={handlePromptsClick}
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            Prompts
            <Text fontSize="xs" color="gray.400">{promptsOpen ? '▾' : '▸'}</Text>
          </Box>

          {promptsOpen && (
            <VStack align="stretch" gap={0} pl={3}>
              {PROMPT_ITEMS.map((item) => (
                <NavLink key={item.path} to={item.path}>
                  {({ isActive }) => (
                    <Box
                      px={3}
                      py={1.5}
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
          )}

          {/* Other nav items */}
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

      {/* Main content */}
      <Box flex={1} overflow="auto" bg="gray.50">
        {children}
      </Box>
    </Flex>
  )
}
