import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { BsArrowRight } from 'react-icons/bs';
import { LiveSession } from '../LiveSession/LiveSession';
import { SessionList } from '../SessionList/SessionList';
import { Box, Button, Flex, Heading, Text, Container } from '@chakra-ui/react';
import { useAuth } from '../../contexts/AuthContext';
import { useUserSessions } from '../../hooks/useUserSessions';

const MotionBox = motion.create(Box);

export function Hero() {
  const [showDemo, setShowDemo] = useState(false);
  const { isAnonymous } = useAuth();
  const { sessions, isLoading } = useUserSessions();

  return (
    <Box
      position="relative"
      minH="100vh"
      h="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      overflow="hidden"
    >
      {/* Animated gradient background */}
      <Box
        position="absolute"
        inset={0}
        bgGradient="to-br"
        gradientFrom="primary.500"
        gradientVia="purple.600"
        gradientTo="primary.700"
      >
        <Box
          position="absolute"
          inset={0}
          backgroundImage="url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')"
          opacity={0.4}
        />
      </Box>

      {/* Content */}
      <Flex position="relative" zIndex={10} w="full" h="100%">
        {/* SessionList for logged in users */}
        {!isAnonymous && (
          <SessionList
            sessions={sessions}
            isLoading={isLoading}
            height="100%"
          />
        )}

        <Container
          position="relative"
          maxW="7xl"
          px={{ base: 4, sm: 6, lg: 8 }}
          w="full"
          h="full"
          flex={1}
        >
          <Flex
            direction={{ base: "column", md: "row" }}
            gap={12}
            align="center"
            justify="center"
            h="full"
          >
          {/* Heading - Initially Centered, Then Moves Left */}
          <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            display="flex"
            flexDirection="column"
            className={showDemo ? '' : 'max-w-3xl text-center'}
            flex={showDemo ? 1 : undefined}
            alignItems={showDemo ? "flex-start" : "center"}
            justifyContent="center"
          >
            <Heading as="h1" fontWeight="bold" color="white" lineHeight="1.1">
              <Text as="span" display="block" fontSize={{ base: "5xl", md: "7xl" }}>
                Master Arabic
              </Text>
              <Text
                as="span"
                display="block"
                fontSize={{ base: "3xl", md: "5xl" }}
                mt={0}
                bgGradient="to-r"
                gradientFrom="accent.300"
                gradientTo="accent.500"
                bgClip="text"
                color="transparent"
                lineHeight="1.2"
                pb={2}
              >
                with AI-Powered Conversations
              </Text>
            </Heading>

            {/* Buttons */}
            <MotionBox
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              mt={8}
              display="flex"
              alignItems="center"
              gap={4}
            >
              <Button
                size="xl"
                bg="white"
                color="primary.600"
                _hover={{ bg: "gray.100", boxShadow: "xl" }}
                boxShadow="lg"
                rounded="lg"
                fontSize="lg"
                transition="all 0.3s"
              >
                Sign Up
              </Button>
              {!showDemo && (
                <Button
                  onClick={() => setShowDemo(true)}
                  size="xl"
                  bg="accent.500"
                  color="white"
                  _hover={{ bg: "accent.600", boxShadow: "xl" }}
                  boxShadow="lg"
                  rounded="lg"
                  fontSize="lg"
                  transition="all 0.3s"
                >
                  Chat Now <BsArrowRight className="text-xl" />
                </Button>
              )}
            </MotionBox>
          </MotionBox>

          {/* Voice Agent Widget - Fades in after heading moves */}
          <AnimatePresence>
            {showDemo && (
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
                <LiveSession />
              </MotionBox>
            )}
          </AnimatePresence>
        </Flex>
      </Container>
      </Flex>
    </Box>
  );
}
