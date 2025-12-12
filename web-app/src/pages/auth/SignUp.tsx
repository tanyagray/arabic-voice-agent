import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Box, Button, Input, VStack, Heading, Text, Link, Stack, Alert } from '@chakra-ui/react';
import { Field } from "@/components/ui/field"

const SignUp: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setError(null);
      setLoading(true);
      await signUp(email, password);
      navigate(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <VStack gap={6}>
      <Box textAlign="center" pt={6}>
        <Heading as="h1" size="xl" fontWeight="bold" mb={4}>Sign Up</Heading>
        <Text color="gray.600" mb={6}>Create your account to get started</Text>
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
                autoComplete="new-password"
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
            bg="yellow.400"
            _hover={{ bg: "yellow.500" }}
          >
            {loading ? 'Creating account...' : 'Sign up'}
          </Button>

          <Box fontSize="sm" textAlign="center">
            <Link
              asChild
              color="blue.200"
              _hover={{ color: "blue.100" }}
              fontWeight="medium"
            >
              <RouterLink to="/sign-in">
                Already have an account? Sign in
              </RouterLink>
            </Link>
          </Box>
        </VStack>
      </form>
    </VStack>
  );
};

export default SignUp;