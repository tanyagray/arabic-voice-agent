import { motion } from 'motion/react';
import { Box, Container, Heading, Text, Grid, Flex } from '@chakra-ui/react';

const features = [
  {
    icon: '🗣️',
    title: 'Multiple Arabic Dialects',
    description: 'Practice Modern Standard Arabic, Iraqi, and Egyptian dialects with native-like pronunciation and cultural context.',
    gradient: 'linear(to-r, blue.500, cyan.500)',
  },
  {
    icon: '🔄',
    title: 'Seamless Code-Switching',
    description: 'Mix English and Arabic naturally in conversation, just like real bilinguals do in everyday life.',
    gradient: 'linear(to-r, purple.500, pink.500)',
  },
  {
    icon: '🤖',
    title: 'AI-Powered Tutor',
    description: 'Powered by GPT-4o and advanced voice models for natural, context-aware conversations and instant feedback.',
    gradient: 'linear(to-r, orange.500, red.500)',
  },
  {
    icon: '⚡',
    title: 'Real-Time Voice',
    description: 'Ultra-low latency voice processing using LiveKit infrastructure for smooth, natural conversations.',
    gradient: 'linear(to-r, green.500, emerald.500)',
  },
  {
    icon: '📱',
    title: 'Cross-Platform',
    description: 'Available on iOS, Android, and web. Practice Arabic anywhere, anytime, on any device.',
    gradient: 'linear(to-r, indigo.500, purple.500)',
  },
  {
    icon: '🎯',
    title: 'Personalized Learning',
    description: 'Adaptive conversation topics and difficulty levels that grow with your Arabic language skills.',
    gradient: 'linear(to-r, yellow.500, orange.500)',
  },
];

const MotionBox = motion.create(Box);

export function Features() {
  return (
    <Box as="section" py={24} bgGradient="to-b" gradientFrom="gray.50" gradientTo="white">
      <Container maxW="7xl" px={{ base: 4, sm: 6, lg: 8 }}>
        {/* Section header */}
        <MotionBox
          textAlign="center"
          mb={16}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Heading as="h2" size="2xl" fontWeight="bold" color="gray.900" mb={4}>
            Everything You Need to{" "}
            <Text as="span" display="block" bgGradient="to-r" gradientFrom="primary.600" gradientTo="purple.600" bgClip="text" color="transparent">
              Master Arabic
            </Text>
          </Heading>
          <Text fontSize="xl" color="gray.600" maxW="3xl" mx="auto">
            A comprehensive language learning platform that adapts to your needs and learning style
          </Text>
        </MotionBox>

        {/* Features grid */}
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }} gap={8}>
          {features.map((feature, idx) => (
            <MotionBox
              key={idx}
              className="group"
              position="relative"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
            >
              {/* Card */}
              <Box
                h="full"
                bg="white"
                rounded="2xl"
                p={8}
                boxShadow="lg"
                _hover={{ boxShadow: "2xl", borderColor: "transparent" }}
                transition="all 0.3s"
                borderWidth="1px"
                borderColor="gray.100"
                position="relative"
                overflow="hidden"
              >
                {/* Gradient overlay on hover */}
                <Box
                  position="absolute"
                  inset={0}
                  bgGradient={feature.gradient}
                  opacity={0}
                  _groupHover={{ opacity: 0.05 }}
                  transition="opacity 0.3s"
                />

                {/* Content */}
                <Box position="relative" zIndex={10}>
                  {/* Icon */}
                  <Box mb={6}>
                    <Flex
                      w={16}
                      h={16}
                      bgGradient={feature.gradient}
                      rounded="xl"
                      align="center"
                      justify="center"
                      fontSize="3xl"
                      boxShadow="lg"
                      transform="auto"
                      _groupHover={{ scale: 1.1, rotate: "3deg" }}
                      transition="transform 0.3s"
                    >
                      {feature.icon}
                    </Flex>
                  </Box>

                  {/* Title */}
                  <Heading
                    as="h3"
                    size="md"
                    fontWeight="bold"
                    color="gray.900"
                    mb={3}
                    _groupHover={{ color: "transparent", bgClip: "text", bgGradient: "to-r", gradientFrom: "primary.600", gradientTo: "purple.600" }}
                    transition="all 0.3s"
                  >
                    {feature.title}
                  </Heading>

                  {/* Description */}
                  <Text color="gray.600" lineHeight="relaxed">
                    {feature.description}
                  </Text>
                </Box>
              </Box>
            </MotionBox>
          ))}
        </Grid>

        {/* Stats section */}
        <MotionBox
          mt={24}
          display="grid"
          gridTemplateColumns={{ base: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }}
          gap={8}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {[
            { value: '3', label: 'Arabic Dialects' },
            { value: '<50ms', label: 'Voice Latency' },
            { value: '24/7', label: 'Available' },
            { value: '100%', label: 'Natural Speech' },
          ].map((stat, idx) => (
            <Box key={idx} textAlign="center">
              <Text
                fontSize={{ base: "4xl", md: "5xl" }}
                fontWeight="bold"
                bgGradient="to-r"
                gradientFrom="primary.600"
                gradientTo="purple.600"
                bgClip="text"
                color="transparent"
                mb={2}
              >
                {stat.value}
              </Text>
              <Text color="gray.600" fontWeight="medium">{stat.label}</Text>
            </Box>
          ))}
        </MotionBox>
      </Container>
    </Box>
  );
}
