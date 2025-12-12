import { motion } from 'framer-motion';
import { BsArrowRight } from 'react-icons/bs';
import { Box, Button, Heading, Text } from '@chakra-ui/react';

const MotionBox = motion.create(Box);

interface HeroCTAProps {
  showDemo: boolean;
  onChatNowClick: () => void;
}

export function HeroCTA({ showDemo, onChatNowClick }: HeroCTAProps) {
  return (
    <MotionBox
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{ duration: 0.8, ease: 'easeInOut' }}
      display="flex"
      flexDirection="column"
      className={showDemo ? '' : 'max-w-3xl text-center'}
      flex={showDemo ? 1 : undefined}
      alignItems={showDemo ? "flex-start" : "center"}
      justifyContent="center"
    >
      <Heading as="h1" fontWeight="bold" color="white" lineHeight="1.1">
        <Text as="span" display="block" fontSize={{ base: "5xl", md: "7xl" }}>
          Master Arabic
        </Text>
        <Text
          as="span"
          display="block"
          fontSize={{ base: "3xl", md: "5xl" }}
          mt={0}
          bgGradient="to-r"
          gradientFrom="accent.300"
          gradientTo="accent.500"
          bgClip="text"
          color="transparent"
          lineHeight="1.2"
          pb={2}
        >
          with AI-Powered Conversations
        </Text>
      </Heading>

      {/* Buttons */}
      <MotionBox
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        mt={8}
        display="flex"
        alignItems="center"
        gap={4}
      >
        <Button
          size="xl"
          bg="white"
          color="primary.600"
          _hover={{ bg: "gray.100", boxShadow: "xl" }}
          boxShadow="lg"
          rounded="lg"
          fontSize="lg"
          transition="all 0.3s"
        >
          Sign Up
        </Button>
        {!showDemo && (
          <Button
            onClick={onChatNowClick}
            size="xl"
            bg="accent.500"
            color="white"
            _hover={{ bg: "accent.600", boxShadow: "xl" }}
            boxShadow="lg"
            rounded="lg"
            fontSize="lg"
            transition="all 0.3s"
          >
            Chat Now <BsArrowRight className="text-xl" />
          </Button>
        )}
      </MotionBox>
    </MotionBox>
  );
}
