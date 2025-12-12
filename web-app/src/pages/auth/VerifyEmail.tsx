import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  VStack,
  Text,
  Button,
  Image,
  Heading,
  PinInput,
  Link,
  Alert
} from '@chakra-ui/react';

const VerifyEmail: React.FC = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [hasAttemptedCurrentOtp, setHasAttemptedCurrentOtp] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.email_confirmed_at) {
      console.log('User already verified, redirecting to chat');
      navigate('/', { replace: true });
      return;
    }

    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    } else if (user?.email) {
      setEmail(user.email);
    }

    const token = searchParams.get('token');
    if (token && (emailParam || user?.email)) {
      const handleTokenVerification = async (tokenParam: string, emailAddress: string) => {
        try {
          setLoading(true);
          setError(null);

          const { error } = await supabase.auth.verifyOtp({
            email: emailAddress,
            token: tokenParam,
            type: 'email'
          });

          if (error) throw error;

          setTimeout(() => navigate('/', { replace: true }), 2000);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to verify email');
        } finally {
          setLoading(false);
        }
      };

      handleTokenVerification(token, emailParam || user?.email || '');
    }
  }, [user, searchParams, navigate]);

  const handleOtpVerification = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const otpString = otp.join('');
    if (!email || !otpString || otpString.length !== 6) {
      setError('Email and 6-digit verification code are required');
      return;
    }

    setHasAttemptedCurrentOtp(true);

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otpString,
        type: 'email'
      });

      if (error) throw error;

      await supabase.auth.getSession();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify email');
    } finally {
      setLoading(false);
    }
  }, [otp, email, navigate]);

  useEffect(() => {
    const otpString = otp.join('');
    if (otpString.length === 6 && email && !loading && !hasAttemptedCurrentOtp) {
      handleOtpVerification();
    }
  }, [otp, email, loading, hasAttemptedCurrentOtp, handleOtpVerification]);

  const handleResendVerification = async () => {
    if (!email) {
      setError('Email is required to resend verification');
      return;
    }

    try {
      setResendLoading(true);
      setError(null);

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email?email=${encodeURIComponent(email)}`
        }
      });

      if (error) throw error;

      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 10000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend verification email');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <VStack gap={10} py={8} maxW="md" mx="auto">
      <VStack gap={12} textAlign="center">
        <Image
          src="/logo.svg"
          alt="Arabic Voice Agent"
          h={32}
          mx="auto"
        />
        <VStack gap={6}>
          <Heading fontSize="2xl" color="white" fontWeight="bold">
            Enter your verification code
          </Heading>
          <VStack gap={2}>
            <Text color="blue.200">
              Or click <Text as="strong" color="white">verify</Text> in the email sent to
            </Text>
            <Text color="white" fontWeight="bold">
              {email}
            </Text>
          </VStack>
        </VStack>
      </VStack>

      <VStack gap={8} w="full">
        <VStack gap={4} align="center">
          <PinInput.Root
            otp
            onValueChange={(details) => {
              setOtp(details.value);
              if (error) setError(null);
              setHasAttemptedCurrentOtp(false);
            }}
            value={otp}
            size="lg"
          >
            <PinInput.HiddenInput />
            <PinInput.Control>
              {Array.from({ length: 6 }).map((_, id) => (
                <PinInput.Input key={id} index={id} bg="white" color="black" />
              ))}
            </PinInput.Control>
          </PinInput.Root>

          {error && (
            <Alert.Root status="error" variant="surface" alignSelf="stretch">
              <Alert.Indicator />
              <Alert.Title>{error}</Alert.Title>
            </Alert.Root>
          )}
        </VStack>

        <Button
          variant="ghost"
          onClick={handleResendVerification}
          disabled={resendLoading || emailSent}
          size="sm"
          color="blue.200"
          _hover={{ color: emailSent ? "blue.200" : "white" }}
          opacity={1}
          transition="all 0.3s ease-in-out"
          position="relative"
        >
          <Text
            transition="opacity 0.3s ease-in-out"
            opacity={emailSent ? 0 : 1}
            position={emailSent ? "absolute" : undefined}
          >
            Send verification email again
          </Text>
          <Text
            transition="opacity 0.3s ease-in-out"
            opacity={emailSent ? 1 : 0}
            position={!emailSent ? "absolute" : undefined}
          >
            Email sent! Check your inbox 👍
          </Text>
        </Button>

        <Link
          onClick={() => navigate('/sign-in')}
          fontSize="sm"
          color="blue.200"
          _hover={{ color: "white" }}
          cursor="pointer"
        >
          ← Back to sign in
        </Link>
      </VStack>
    </VStack>
  );
};

export default VerifyEmail;