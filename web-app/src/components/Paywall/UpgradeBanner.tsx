import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Box, Button, Flex, Text } from '@chakra-ui/react';
import { usePlan } from '@/hooks/usePlan';

const POLL_MS = 2000;
const TIMEOUT_MS = 20000;

/**
 * Handles the return from Stripe Checkout (`?upgraded=1`).
 *
 * Webhooks are async — the user can land back on the app a second or two
 * before Stripe posts `checkout.session.completed`. We poll `/billing/me`
 * until `plan === 'pro'` or we time out, then show a banner reflecting the
 * outcome. The `upgraded` query param is stripped immediately so a refresh
 * doesn't replay this flow.
 */
export function UpgradeBanner() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data } = usePlan();

  const isReturn = searchParams.get('upgraded') === '1';
  const [phase, setPhase] = useState<'idle' | 'activating' | 'success' | 'pending'>(
    isReturn ? 'activating' : 'idle',
  );
  const startedAtRef = useRef<number | null>(null);

  // Strip the query param on first mount so refresh won't replay.
  useEffect(() => {
    if (!isReturn) return;
    startedAtRef.current = Date.now();
    queryClient.invalidateQueries({ queryKey: ['billing', 'me'] });
    const next = new URLSearchParams(searchParams);
    next.delete('upgraded');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll billing/me while activating.
  useEffect(() => {
    if (phase !== 'activating') return;
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['billing', 'me'] });
      const elapsed = Date.now() - (startedAtRef.current ?? Date.now());
      if (elapsed > TIMEOUT_MS) {
        setPhase('pending');
      }
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [phase, queryClient]);

  // React to the plan actually flipping.
  useEffect(() => {
    if (phase === 'activating' && data?.plan === 'pro') {
      setPhase('success');
    }
  }, [phase, data?.plan]);

  if (phase === 'idle') return null;

  const { bg, title, body, cta } = (() => {
    if (phase === 'success') {
      return {
        bg: 'green.600',
        title: 'Welcome to Pro! 🎉',
        body: 'All dialects, unlimited chat, and a generous voice allowance are now unlocked.',
        cta: { label: 'Dismiss', action: () => setPhase('idle') },
      };
    }
    if (phase === 'pending') {
      return {
        bg: 'yellow.600',
        title: 'Payment received — your upgrade is processing',
        body: 'Stripe is taking a little longer than usual to confirm. Your Pro access will activate automatically; you can keep using the app in the meantime.',
        cta: { label: 'OK', action: () => setPhase('idle') },
      };
    }
    return {
      bg: 'blue.600',
      title: 'Activating your subscription…',
      body: 'Finalizing payment with Stripe. This usually takes a few seconds.',
      cta: null,
    };
  })();

  return (
    <Box bg={bg} color="white" px={4} py={3} zIndex={60}>
      <Flex maxW="900px" mx="auto" align="center" gap={4} wrap="wrap">
        <Box flex={1} minW="200px">
          <Text fontWeight="bold">{title}</Text>
          <Text fontSize="sm" color="whiteAlpha.900">{body}</Text>
        </Box>
        <Flex gap={2}>
          {phase === 'success' && (
            <Button size="sm" variant="outline" color="white" onClick={() => navigate('/pricing')}>
              View plan
            </Button>
          )}
          {cta && (
            <Button size="sm" bg="white" color="gray.900" onClick={cta.action}>
              {cta.label}
            </Button>
          )}
        </Flex>
      </Flex>
    </Box>
  );
}
