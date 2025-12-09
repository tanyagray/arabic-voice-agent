import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Box, Button, Input, VStack, Image, Link, Stack, Alert } from '@chakra-ui/react';
import { Field } from "@/components/ui/field"

const SignIn: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setLoading(true);
      await signIn(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <VStack gap={6}>
      <Box textAlign="center" pt={6}>
        <Image
          src="/logo.svg"
          alt="Arabic Voice Agent"
          h={32}
          w="auto"
          mx="auto"
          mb={2}
        />
      </Box>
      <form onSubmit={handleSubmit} style={{ width: '100%' }}>
        <VStack gap={4} w="full">
          {error && (
            <Alert.Root status="error" variant="surface">
              <Alert.Indicator />
              <Alert.Title>{error}</Alert.Title>
            </Alert.Root>
          )}
          <Stack gap={2} w="full">
            <Field label="Email address" required>
              <Input
                name="email"
                type="email"
                autoComplete="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                bg="white/90"
                backdropFilter="blur(4px)"
              />
            </Field>
            <Field label="Password" required>
              <Input
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                bg="white/90"
                backdropFilter="blur(4px)"
              />
            </Field>
          </Stack>

          <Button
            type="submit"
            disabled={loading}
            loading={loading}
            w="full"
            color="gray.900"
            bg="accent.400"
            _hover={{ bg: "accent.500" }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>

          <VStack gap={2} fontSize="sm" w="full">
            <Link
              asChild
              color="blue.200"
              _hover={{ color: "blue.100" }}
              fontWeight="medium"
            >
              <RouterLink to="/forgot-password">
                Forgot your password?
              </RouterLink>
            </Link>
            <Link
              asChild
              color="blue.200"
              _hover={{ color: "blue.100" }}
              fontWeight="medium"
            >
              <RouterLink to="/sign-up">
                Don't have an account? Sign up
              </RouterLink>
            </Link>
          </VStack>
        </VStack>
      </form>
    </VStack>
  );
};

export default SignIn;