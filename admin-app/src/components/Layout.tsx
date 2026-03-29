import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Box, Flex, VStack, Text, Button, Separator } from '@chakra-ui/react'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { label: 'Prompts', path: '/prompts' },
  { label: 'Chat Debug', path: '/debug/chat' },
  { label: 'Voice Debug', path: '/debug/voice' },
]

export function Layout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <Flex h="100vh" overflow="hidden">
      {/* Sidebar */}
      <Box w="200px" bg="gray.900" color="white" p={4} flexShrink={0} display="flex" flexDirection="column">
        <Text fontWeight="bold" fontSize="lg" mb={6}>Admin</Text>
        <VStack align="stretch" gap={1} flex={1}>
          {NAV_ITEMS.map((item) => (
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
