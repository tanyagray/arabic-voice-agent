import { Spinner, Center } from "@chakra-ui/react";

export function LoadingSpinner() {
  return (
    <Center minH="100vh">
      <Spinner size="xl" color="white" borderWidth="2px" />
    </Center>
  );
}
