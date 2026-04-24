import { useNavigate } from 'react-router-dom';
import { Box, Button, Flex, Text } from '@chakra-ui/react';
import { usePlan } from '@/hooks/usePlan';

export function UsageMeter() {
  const navigate = useNavigate();
  const { data } = usePlan();
  if (!data || data.plan === 'pro') return null;

  const used = data.usage.voice_seconds_this_month;
  const cap = data.limits.free_voice_monthly_seconds;
  const pct = Math.min(100, Math.round((used / Math.max(cap, 1)) * 100));
  const remainingMin = Math.max(0, Math.floor((cap - used) / 60));

  return (
    <Box bg="whiteAlpha.100" px={3} py={2} borderRadius="md">
      <Flex justify="space-between" align="center" mb={1}>
        <Text fontSize="xs" color="white">
          Free voice: {remainingMin} min left this month
        </Text>
        <Button
          size="xs"
          variant="ghost"
          color="yellow.200"
          onClick={() => navigate('/pricing')}
        >
          Upgrade
        </Button>
      </Flex>
      <Box h="4px" bg="whiteAlpha.300" borderRadius="full" overflow="hidden">
        <Box h="100%" w={`${pct}%`} bg={pct >= 90 ? 'red.400' : 'yellow.300'} />
      </Box>
    </Box>
  );
}
