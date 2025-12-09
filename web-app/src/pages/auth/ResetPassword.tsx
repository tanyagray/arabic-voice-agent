import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Box, Button, Input, VStack, Image, Text, Alert, Heading, Stack } from '@chakra-ui/react';
import { Field } from "@/components/ui/field"

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { updatePassword, user } = useAuth();

  useEffect(() => {
    const handlePasswordReset = async () => {
      try {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        const token = searchParams.get('token');
        const searchType = searchParams.get('type');

        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            setError('Invalid or expired reset link. Please request a new password reset.');
          } else if (data.session) {
            setIsValidToken(true);
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } else if (token && searchType === 'recovery') {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: 'recovery'
          });

          if (error) {
            setError('Invalid or expired reset link. Please request a new password reset.');
          } else if (data.session) {
            setIsValidToken(true);
          } else {
            setError('Failed to establish session. Please request a new password reset.');
          }
        } else {
          const { data: { session } } = await supabase.auth.getSession();

          if (session?.user) {
            setIsValidToken(true);
          } else {
            setError('Invalid or expired reset link. Please request a new password reset.');
          }
        }
      } catch (err) {
        setError('Failed to validate reset link');
      } finally {
        setIsChecking(false);
      }
    };

    handlePasswordReset();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      setError(null);
      setLoading(true);
      await updatePassword(password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  if (isChecking) {
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
        <Box textAlign="center">
          <Text color="white">Validating reset link...</Text>
        </Box>
      </VStack>
    );
  }

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
              Password updated successfully! You can now sign in with your new password.
            </Alert.Description>
          </Alert.Root>
          <Box fontSize="sm">
            <Button
              variant="plain"
              onClick={() => navigate('/sign-in')}
              color="blue.200"
              _hover={{ color: "blue.100" }}
            >
              Go to sign in
            </Button>
          </Box>
        </VStack>
      </VStack>
    );
  }

  if (!isValidToken && !isChecking) {
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
          <Box textAlign="center" mb={4}>
            <Heading as="h2" size="lg" fontWeight="semibold" color="white" mb={2}>Password Reset</Heading>
            <Text color="gray.300" fontSize="sm">
              {error || 'Unable to validate your reset link. This could be because the link has expired or is invalid.'}
            </Text>
          </Box>
          {error && (
            <Alert.Root status="error" variant="surface">
              <Alert.Indicator />
              <Alert.Title>{error}</Alert.Title>
            </Alert.Root>
          )}
          <VStack gap={2} fontSize="sm">
            <Button
              variant="plain"
              onClick={() => navigate('/forgot-password')}
              color="blue.200"
              _hover={{ color: "blue.100" }}
            >
              Request new reset link
            </Button>
            <Button
              variant="plain"
              onClick={() => navigate('/sign-in')}
              color="blue.200"
              _hover={{ color: "blue.100" }}
            >
              Back to sign in
            </Button>
          </VStack>
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
        <Heading as="h2" size="xl" fontWeight="semibold" color="white" mb={2}>
          {user?.email ? `Choose a new password for ${user.email}` : 'Reset your password'}
        </Heading>
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
            <Field label="New Password" required>
              <Input
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                bg="white/90"
                backdropFilter="blur(4px)"
              />
            </Field>
            <Field label="Confirm New Password" required>
              <Input
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
            {loading ? 'Updating...' : 'Update password'}
          </Button>
        </VStack>
      </form>
    </VStack>
  );
};

export default ResetPassword;