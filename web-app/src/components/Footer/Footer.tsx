import { Box, Container, Grid, Heading, Text, List, Link, Flex } from '@chakra-ui/react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <Box as="footer" bg="gray.900" color="white" py={12}>
      <Container maxW="7xl" px={{ base: 4, sm: 6, lg: 8 }}>
        <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={8} mb={8}>
          {/* Brand */}
          <Box>
            <Heading
              as="h3"
              size="lg"
              fontWeight="bold"
              bgGradient="to-r"
              gradientFrom="primary.400"
              gradientTo="accent.400"
              bgClip="text"
              color="transparent"
              mb={4}
            >
              Arabic Voice Agent
            </Heading>
            <Text color="gray.400">
              Master Arabic through AI-powered conversations with support for multiple dialects and natural code-switching.
            </Text>
          </Box>

          {/* Supported Dialects */}
          <Box>
            <Heading as="h4" size="md" fontWeight="semibold" mb={4}>Supported Dialects</Heading>
            <List.Root spaceY={2} color="gray.400" listStyleType="none">
              <List.Item>Modern Standard Arabic (MSA)</List.Item>
              <List.Item>Iraqi Arabic</List.Item>
              <List.Item>Egyptian Arabic</List.Item>
              <List.Item>English Code-Switching</List.Item>
            </List.Root>
          </Box>

          {/* Technology */}
          <Box>
            <Heading as="h4" size="md" fontWeight="semibold" mb={4}>Powered By</Heading>
            <List.Root spaceY={2} color="gray.400" listStyleType="none">
              <List.Item>OpenAI GPT-4o</List.Item>
              <List.Item>ElevenLabs TTS</List.Item>
              <List.Item>Soniox STT</List.Item>
              <List.Item>LiveKit Infrastructure</List.Item>
            </List.Root>
          </Box>
        </Grid>

        {/* Bottom bar */}
        <Flex
          pt={8}
          borderTopWidth="1px"
          borderColor="gray.800"
          direction={{ base: "column", md: "row" }}
          justify="space-between"
          align="center"
          gap={4}
        >
          <Text color="gray.400" fontSize="sm">
            © {currentYear} Arabic Voice Agent. Built with ❤️ for Arabic learners.
          </Text>
          <Flex gap={6}>
            {["Privacy", "Terms", "GitHub"].map((item) => (
              <Link
                key={item}
                href="#"
                color="gray.400"
                _hover={{ color: "primary.400" }}
                transition="colors"
                fontSize="sm"
              >
                {item}
              </Link>
            ))}
          </Flex>
        </Flex>
      </Container>
    </Box>
  );
}
