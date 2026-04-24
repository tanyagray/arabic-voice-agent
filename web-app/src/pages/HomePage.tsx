import { useEffect } from 'react';
import { Header } from '../components/Header';
import { ActiveSession } from '../components/ActiveSession/ActiveSession';
import { UpgradeBanner } from '../components/Paywall/UpgradeBanner';
import { useStore } from '../store';
import { Box, Flex } from '@chakra-ui/react';
import { appGradient } from '@/lib/styles';

function HomePage() {
  const loadSessions = useStore((s) => s.session.loadSessions);

  // Load sessions on mount (creates one if none exist)
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  return (
    <Flex
      minH="100vh"
      h="100vh"
      direction="column"
      overflow="hidden"
      style={{ backgroundImage: appGradient }}
    >
      <Header />
      <UpgradeBanner />
      <Box flex={1} minH={0} pt="80px" px={{ base: 0, md: 6 }} pb={{ base: 4, md: 6 }} position="relative" zIndex={1}>
        <ActiveSession />
      </Box>
    </Flex>
  );
}

export default HomePage;
