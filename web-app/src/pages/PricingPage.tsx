import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  List,
  Stack,
  Text,
} from '@chakra-ui/react';
import { Header } from '@/components/Header';
import { appGradient } from '@/lib/styles';
import { useAuth } from '@/context/AuthContext';
import { usePlan } from '@/hooks/usePlan';
import { openBillingPortal, startCheckout } from '@/api/billing';

type Interval = 'month' | 'year';

function FeatureList({ items }: { items: string[] }) {
  return (
    <List.Root gap={2} pl={0}>
      {items.map((f) => (
        <List.Item key={f} color="gray.200" fontSize="sm" listStyle="none">
          ✓ {f}
        </List.Item>
      ))}
    </List.Root>
  );
}

function PricingPage() {
  const navigate = useNavigate();
  const { isAnonymous } = useAuth();
  const { data: plan } = usePlan();
  const [loadingInterval, setLoadingInterval] = useState<Interval | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isPro = plan?.plan === 'pro';

  const handleUpgrade = async (interval: Interval) => {
    setError(null);
    if (isAnonymous) {
      navigate('/sign-in?intent=upgrade');
      return;
    }
    try {
      setLoadingInterval(interval);
      const url = await startCheckout(interval);
      window.location.href = url;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not start checkout';
      setError(msg);
    } finally {
      setLoadingInterval(null);
    }
  };

  const handleManage = async () => {
    setError(null);
    try {
      const url = await openBillingPortal();
      window.location.href = url;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not open billing portal';
      setError(msg);
    }
  };

  return (
    <Flex minH="100vh" direction="column" style={{ backgroundImage: appGradient }}>
      <Header />
      <Box flex={1} pt="100px" px={{ base: 4, md: 6 }} pb={10}>
        <Container maxW="900px">
          <Stack gap={2} textAlign="center" mb={10}>
            <Heading as="h1" size="2xl" color="white">
              Simple pricing
            </Heading>
            <Text color="whiteAlpha.800">
              Start free. Upgrade when you want more.
            </Text>
          </Stack>

          {error && (
            <Box bg="red.900" color="red.100" p={3} borderRadius="md" mb={6}>
              {error}
            </Box>
          )}

          <Flex gap={6} direction={{ base: 'column', md: 'row' }} align="stretch">
            <Box
              flex={1}
              bg="whiteAlpha.100"
              borderWidth={1}
              borderColor="whiteAlpha.300"
              borderRadius="xl"
              p={6}
            >
              <Heading as="h2" size="lg" color="white" mb={1}>
                Free
              </Heading>
              <Text color="whiteAlpha.800" mb={4}>$0 forever</Text>
              <FeatureList
                items={[
                  '60 voice minutes / month',
                  'Modern Standard Arabic (MSA)',
                  '30 chat messages / day',
                  '1 flashcard set',
                  'Conversation history (7 days)',
                ]}
              />
              <Button mt={6} variant="outline" color="white" disabled w="100%">
                Current plan
              </Button>
            </Box>

            <Box
              flex={1}
              bg="whiteAlpha.200"
              borderWidth={2}
              borderColor="yellow.300"
              borderRadius="xl"
              p={6}
              position="relative"
            >
              <Box
                position="absolute"
                top={-3}
                right={4}
                bg="yellow.300"
                color="gray.900"
                px={3}
                py={1}
                borderRadius="full"
                fontSize="xs"
                fontWeight="bold"
              >
                MOST POPULAR
              </Box>
              <Heading as="h2" size="lg" color="white" mb={1}>
                Pro
              </Heading>
              <Text color="whiteAlpha.900" fontSize="xl" mb={4}>
                $9.99 / month · <Text as="span" color="yellow.200">$69 / year</Text>
              </Text>
              <FeatureList
                items={[
                  'Generous daily voice allowance',
                  'All dialects (MSA, Iraqi, and more)',
                  'Unlimited chat',
                  'Unlimited flashcards',
                  'Full conversation history',
                  'Early access to new features',
                ]}
              />
              <Stack mt={6} gap={2}>
                {isPro ? (
                  <Button bg="white" color="gray.900" onClick={handleManage}>
                    Manage subscription
                  </Button>
                ) : (
                  <>
                    <Button
                      bg="yellow.300"
                      color="gray.900"
                      _hover={{ bg: 'yellow.200' }}
                      onClick={() => handleUpgrade('year')}
                      loading={loadingInterval === 'year'}
                    >
                      Upgrade — $69 / year
                    </Button>
                    <Button
                      variant="outline"
                      color="white"
                      onClick={() => handleUpgrade('month')}
                      loading={loadingInterval === 'month'}
                    >
                      Upgrade — $9.99 / month
                    </Button>
                  </>
                )}
              </Stack>
              {isAnonymous && !isPro && (
                <Text mt={3} color="whiteAlpha.700" fontSize="xs" textAlign="center">
                  You'll need to create an account to upgrade.
                </Text>
              )}
            </Box>
          </Flex>
        </Container>
      </Box>
    </Flex>
  );
}

export default PricingPage;
