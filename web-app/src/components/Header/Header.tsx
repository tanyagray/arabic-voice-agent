import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Box, Button, Container, Flex, Heading, IconButton, Image, Text } from '@chakra-ui/react';
import { LuSettings } from 'react-icons/lu';

export function Header() {
  const { user, isAnonymous, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <Box
      as="header"
      position="absolute"
      top={0}
      left={0}
      right={0}
      zIndex={50}
      px={{ base: 4, md: 6 }}
      py={4}
    >
      <Container maxW="7xl" px={0}>
        <Flex justify="space-between" align="center">
          <Heading as="h1" size="md" fontWeight="bold" color="white">
            <Flex align="center" gap={2}>
              <Image src="/favicon.svg" alt="mishmish.ai logo" boxSize="24px" />
              mishmish.ai
            </Flex>
          </Heading>
          <Box>
            <Flex align="center" gap={2}>
              <IconButton
                aria-label="Settings"
                variant="ghost"
                size="sm"
                color="white"
                _hover={{ bg: "white/10" }}
                onClick={() => navigate('/settings')}
              >
                <LuSettings />
              </IconButton>
              {isAnonymous ? (
                <Button
                  bg="white"
                  color="gray.900"
                  _hover={{ bg: "gray.100" }}
                  onClick={() => navigate('/sign-in')}
                  fontWeight="medium"
                >
                  Sign In
                </Button>
              ) : (
                <Flex align="center" gap={4}>
                  <Text fontSize="sm" color="white/80">
                    {user?.email}
                  </Text>
                  <Button
                    variant="ghost"
                    size="sm"
                    color="white"
                    _hover={{ color: "gray.200", bg: "white/10" }}
                    onClick={() => signOut()}
                  >
                    Sign Out
                  </Button>
                </Flex>
              )}
            </Flex>
          </Box>
        </Flex>
      </Container>
    </Box>
  );
}
