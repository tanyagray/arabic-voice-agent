import { Spinner, Center } from "@chakra-ui/react";

export function LoadingSpinner() {
  return (
    <Center
      minH="100vh"
      bgGradient="to-br"
      gradientFrom="primary.500"
      gradientVia="purple.600"
      gradientTo="primary.700"
    >
      <Spinner size="xl" color="white" borderWidth="2px" />
    </Center>
  );
}
