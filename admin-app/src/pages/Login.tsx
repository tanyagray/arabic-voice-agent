import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, Field, Heading, Input, VStack, Alert } from '@chakra-ui/react'
import { useAuth } from '../context/AuthContext'

export function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) {
      setError(error)
    } else {
      navigate('/prompts')
    }
  }

  return (
    <Box display="flex" justifyContent="center" alignItems="center" h="100vh" bg="gray.50">
      <Box bg="white" p={8} borderRadius="lg" boxShadow="md" w="full" maxW="400px">
        <Heading size="lg" mb={6}>Admin Login</Heading>
        <form onSubmit={handleSubmit}>
          <VStack gap={4}>
            {error && (
              <Alert.Root status="error" borderRadius="md">
                <Alert.Description>{error}</Alert.Description>
              </Alert.Root>
            )}
            <Field.Root required>
              <Field.Label>Email</Field.Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </Field.Root>
            <Field.Root required>
              <Field.Label>Password</Field.Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </Field.Root>
            <Button type="submit" colorPalette="blue" w="full" loading={loading}>
              Sign In
            </Button>
          </VStack>
        </form>
      </Box>
    </Box>
  )
}
