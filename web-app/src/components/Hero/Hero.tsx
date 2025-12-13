import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { ActiveSession } from '../ActiveSession/ActiveSession';
import { SessionList } from '../SessionList/SessionList';
import { HeroCTA } from '../HeroCTA/HeroCTA';
import { Box, Flex, Container } from '@chakra-ui/react';
import { useAuth } from '../../context/AuthContext';

const MotionBox = motion.create(Box);

export function Hero() {
  const [showDemo, setShowDemo] = useState(false);
  const { isAnonymous } = useAuth();

  return (
    <Flex
      position="relative"
      minH="100vh"
      h="100vh"
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
      {!isAnonymous && (
        <SessionList
          height="100%"
        />
      )}

      <Container
        position="relative"
        zIndex={10}
        maxW="7xl"
        px={{ base: 4, sm: 6, lg: 8 }}
        flex={1}
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Flex
          direction={{ base: "column", md: "row" }}
          gap={12}
          align="center"
          justify="center"
          w="full"
        >
          {isAnonymous && (
            <HeroCTA showDemo={showDemo} onChatNowClick={() => setShowDemo(true)} />
          )}

          <AnimatePresence>
            {(!isAnonymous || showDemo) && (
              <MotionBox
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                flex={1}
                display="flex"
                alignSelf="stretch"
                alignItems="stretch"
              >
                <ActiveSession />
              </MotionBox>
            )}
          </AnimatePresence>
        </Flex>
      </Container>
    </Flex>
  );
}
