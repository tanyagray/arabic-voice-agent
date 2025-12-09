import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Box, Button, Input, VStack, Image, Text, Link, Alert, Heading } from '@chakra-ui/react';
import { Field } from "@/components/ui/field"

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      setLoading(true);
      await resetPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <VStack gap={6}>
        <Box textAlign="center" pt={6}>
          <Image
            src="/logo.svg"
            alt="Arabic Voice Agent"
            h={32}
            mx="auto"
            mb={2}
          />
        </Box>
        <VStack textAlign="center" gap={4}>
          <Alert.Root status="success" variant="surface">
            <Alert.Indicator />
            <Alert.Description>
              Password reset email sent! Check your inbox and follow the link to reset your password.
            </Alert.Description>
          </Alert.Root>
          <Box fontSize="sm">
            <Link
              asChild
              color="blue.200"
              _hover={{ color: "blue.100" }}
              fontWeight="medium"
            >
              <RouterLink to="/sign-in">
                Back to sign in
              </RouterLink>
            </Link>
          </Box>
        </VStack>
      </VStack>
    );
  }

  return (
    <VStack gap={6}>
      <Box textAlign="center" pt={6}>
        <Image
          src="/logo.svg"
          alt="Arabic Voice Agent"
          h={32}
          mx="auto"
          mb={2}
        />
      </Box>
      <Box textAlign="center" mb={4}>
        <Heading as="h2" size="lg" fontWeight="semibold" color="white" mb={2}>Forgot your password?</Heading>
        <Text color="gray.300" fontSize="sm">
          Enter your email address and we'll send you a link to reset your password.
        </Text>
      </Box>
      <form onSubmit={handleSubmit} style={{ width: '100%' }}>
        <VStack gap={4} w="full">
          {error && (
            <Alert.Root status="error" variant="surface">
              <Alert.Indicator />
              <Alert.Title>{error}</Alert.Title>
            </Alert.Root>
          )}
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

          <Button
            type="submit"
            disabled={loading}
            loading={loading}
            w="full"
            color="gray.900"
            bg="yellow.400"
            _hover={{ bg: "yellow.500" }}
          >
            {loading ? 'Sending...' : 'Send reset link'}
          </Button>

          <Box fontSize="sm" textAlign="center">
            <Link
              asChild
              color="blue.200"
              _hover={{ color: "blue.100" }}
              fontWeight="medium"
            >
              <RouterLink to="/sign-in">
                Back to sign in
              </RouterLink>
            </Link>
          </Box>
        </VStack>
      </form>
    </VStack>
  );
};

export default ForgotPassword;