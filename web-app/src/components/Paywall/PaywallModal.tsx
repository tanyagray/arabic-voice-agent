import { useNavigate } from 'react-router-dom';
import { Box, Button, Flex, Heading, Text } from '@chakra-ui/react';

export interface PaywallReason {
  kind: 'voice' | 'chat' | 'dialect';
  message: string;
}

interface Props {
  reason: PaywallReason | null;
  onClose: () => void;
}

export function PaywallModal({ reason, onClose }: Props) {
  const navigate = useNavigate();
  if (!reason) return null;

  return (
    <Flex
      position="fixed"
      inset={0}
      bg="blackAlpha.700"
      zIndex={100}
      align="center"
      justify="center"
      p={4}
      onClick={onClose}
    >
      <Box
        bg="gray.900"
        color="white"
        borderRadius="xl"
        p={6}
        maxW="420px"
        w="100%"
        onClick={(e) => e.stopPropagation()}
      >
        <Heading size="md" mb={2}>
          You've hit a free-plan limit
        </Heading>
        <Text color="whiteAlpha.800" mb={5}>
          {reason.message}
        </Text>
        <Flex gap={3} justify="flex-end">
          <Button variant="ghost" color="white" onClick={onClose}>
            Not now
          </Button>
          <Button
            bg="yellow.300"
            color="gray.900"
            _hover={{ bg: 'yellow.200' }}
            onClick={() => {
              onClose();
              navigate('/pricing');
            }}
          >
            See Pro plans
          </Button>
        </Flex>
      </Box>
    </Flex>
  );
}
