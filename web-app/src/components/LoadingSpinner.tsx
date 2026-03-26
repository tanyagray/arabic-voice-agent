import { Spinner, Center, Text, VStack } from "@chakra-ui/react";

export function LoadingSpinner() {
  return (
    <Center minH="100vh">
      <VStack gap={4}>
        <Spinner size="xl" color="gray.900" borderWidth="2px" />
        <Text color="gray.600">Loading...</Text>
      </VStack>
    </Center>
  );
}
