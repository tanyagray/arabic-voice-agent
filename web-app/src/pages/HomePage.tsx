import { useEffect } from 'react';
import { Header } from '../components/Header';
import { ActiveSession } from '../components/ActiveSession/ActiveSession';
import { PipecatProvider } from '../providers/PipecatProvider';
import { useStore } from '../store';
import { Box, Flex } from '@chakra-ui/react';

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
      bgGradient="to-br"
      gradientFrom="primary.500"
      gradientVia="purple.600"
      gradientTo="primary.700"
      _before={{
        content: '""',
        position: 'absolute',
        inset: 0,
        backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')",
        opacity: 0.4,
      }}
    >
      <Header />
      <Box flex={1} minH={0} pt="80px" px={6} pb={6} position="relative" zIndex={1}>
        <PipecatProvider>
          <ActiveSession />
        </PipecatProvider>
      </Box>
    </Flex>
  );
}

export default HomePage;
