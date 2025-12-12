import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Box, Button, Container, Flex, Heading, Text, HStack } from '@chakra-ui/react';

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
      px={6}
      py={4}
    >
      <Container maxW="7xl" px={0}>
        <Flex justify="space-between" align="center">
          <Heading as="h1" size="md" fontWeight="bold" color="white">
            Arabic Voice Agent
          </Heading>
          <Box>
            {isAnonymous ? (
              <HStack spaceX={3}>
                <Button
                  variant="ghost"
                  color="white"
                  _hover={{ color: "gray.200", bg: "white/10" }}
                  onClick={() => navigate('/sign-in')}
                >
                  Sign In
                </Button>
                <Button
                  bg="white"
                  color="gray.900"
                  _hover={{ bg: "gray.100" }}
                  onClick={() => navigate('/sign-up')}
                  fontWeight="medium"
                >
                  Sign Up
                </Button>
              </HStack>
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
          </Box>
        </Flex>
      </Container>
    </Box>
  );
}
