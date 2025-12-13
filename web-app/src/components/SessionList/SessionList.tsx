import { motion } from 'motion/react';
import { Box, Flex, Text, Spinner } from '@chakra-ui/react';
import { useStore } from '@/store';
import { useEffect } from 'react';

interface SessionListProps {
  onSessionSelect?: (sessionId: string) => void;
  isLoading?: boolean;
  width?: string | number;
  height?: string | number;
}

const MotionBox = motion.create(Box);

export function SessionList({
  onSessionSelect,
  isLoading = false,
  width = "300px",
  height = "100%",
}: SessionListProps) {
  const sessions = useStore((s) => s.session.sessions);
  const activeSession = useStore((s) => s.session.activeSession);
  const loadSessions = useStore((s) => s.session.loadSessions);
  const setActiveSession = useStore((s) => s.session.setActiveSession);

  // load the list of sessions on mount
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  if (isLoading) {
    return (
      <Flex
        w={width}
        h={height}
        bg="whiteAlpha.50"
        backdropFilter="blur(10px)"
        borderRight="1px"
        borderColor="whiteAlpha.200"
        boxShadow="0 4px 6px rgba(0, 0, 0, 0.1)"
        direction="column"
      >
        <Box p={4} borderBottom="1px" borderColor="whiteAlpha.200">
          <Text fontSize="lg" fontWeight="semibold" color="gray.200">
            Sessions
          </Text>
        </Box>
        <Flex flex={1} align="center" justify="center">
          <Spinner size="lg" color="accent.500" />
        </Flex>
      </Flex>
    );
  }

  if (sessions.length === 0) {
    return (
      <Flex
        w={width}
        h={height}
        bg="whiteAlpha.50"
        backdropFilter="blur(10px)"
        borderRight="1px"
        borderColor="whiteAlpha.200"
        boxShadow="0 4px 6px rgba(0, 0, 0, 0.1)"
        direction="column"
      >
        <Box p={4} borderBottom="1px" borderColor="whiteAlpha.200">
          <Text fontSize="lg" fontWeight="semibold" color="gray.200">
            Sessions
          </Text>
        </Box>
        <Flex flex={1} align="center" justify="center" p={4}>
          <Text color="gray.500" fontSize="sm" textAlign="center">
            No sessions yet
          </Text>
        </Flex>
      </Flex>
    );
  }

  return (
    <Flex
      w={width}
      h={height}
      bg="whiteAlpha.50"
      backdropFilter="blur(10px)"
      borderRight="1px"
      borderColor="whiteAlpha.200"
      boxShadow="0 4px 6px rgba(0, 0, 0, 0.1)"
      direction="column"
    >
      <Box p={4} borderBottom="1px" borderColor="whiteAlpha.200">
        <Text fontSize="lg" fontWeight="semibold" color="gray.200">
          Sessions
        </Text>
      </Box>
      <Box flex={1} overflowY="auto">
        {sessions.map((session, index) => {
          const isActive = session.session_id === activeSession?.session_id;

          return (
            <MotionBox
              key={session.session_id}
              as="button"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => {
                setActiveSession(session);
                onSessionSelect?.(session.session_id);
              }}
              w="full"
              px={4}
              py={3}
              borderBottom="1px"
              borderColor={isActive ? 'accent.500/30' : 'gray.800'}
              borderLeft="4px"
              borderLeftColor={isActive ? 'accent.500' : 'transparent'}
              textAlign="left"
              bg={isActive ? 'accent.500/30' : 'transparent'}
              shadow={isActive ? 'md' : 'none'}
              _hover={{
                bg: isActive ? 'accent.500/30' : 'gray.800/50',
              }}
              transitionProperty="all"
              transitionDuration="200ms"
              position="relative"
            >
              {isActive && (
                <MotionBox
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  position="absolute"
                  top={0}
                  left={0}
                  right={0}
                  bottom={0}
                  bg="accent.500/10"
                  pointerEvents="none"
                />
              )}
              <Flex align="start" justify="space-between" gap={2} position="relative">
                <Box flex={1} minW={0}>
                  <Text
                    fontSize="sm"
                    fontFamily="mono"
                    color={isActive ? 'accent.200' : 'gray.300'}
                    fontWeight={isActive ? 'semibold' : 'normal'}
                    truncate
                    title={session.session_id}
                  >
                    {session.session_id.slice(0, 8)}...
                  </Text>
                  <Text
                    fontSize="xs"
                    color={isActive ? 'accent.400' : 'gray.500'}
                    mt={1}
                    fontWeight={isActive ? 'medium' : 'normal'}
                  >
                    {formatDate(session.created_at)}
                  </Text>
                </Box>
                {isActive && (
                  <MotionBox
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    w={2}
                    h={2}
                    bg="accent.500"
                    rounded="full"
                    mt={1}
                    flexShrink={0}
                    shadow="sm"
                  />
                )}
              </Flex>
            </MotionBox>
          );
        })}
      </Box>
    </Flex>
  );
}
