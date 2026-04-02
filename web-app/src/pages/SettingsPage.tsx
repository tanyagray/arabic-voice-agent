import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Container, Flex, Heading, Image, NativeSelect, Text, VStack } from '@chakra-ui/react';
import { appGradient } from '@/lib/styles';
import { Field } from '@/components/ui/field';
import { useStore } from '@/store';
import { patchSessionContext } from '@/api/sessions/sessions.api';
import type { ResponseMode } from '@/api/sessions/sessions.types';

const LANGUAGES = [
  { value: 'ar-AR', label: 'Modern Standard Arabic (MSA)' },
  { value: 'ar-IQ', label: 'Iraqi Arabic' },
  { value: 'es-MX', label: 'Mexican Spanish' },
  { value: 'ru-RU', label: 'Russian' },
  { value: 'mi-NZ', label: 'Te Reo Maori' },
];

const RESPONSE_MODES: { value: ResponseMode; label: string; description: string }[] = [
  { value: 'scaffolded', label: 'Scaffolded', description: 'English with key words in Arabizi' },
  { value: 'transliterated', label: 'Transliterated', description: 'Full Arabizi (romanized)' },
  { value: 'canonical', label: 'Arabic Script', description: 'Raw Arabic script' },
];

function SettingsPage() {
  const navigate = useNavigate();
  const activeSessionId = useStore((s) => s.session.activeSessionId);
  const storeContext = useStore((s) => s.session.context);
  const setContext = useStore((s) => s.session.setContext);
  const [language, setLanguage] = useState(storeContext.language);
  const [responseMode, setResponseMode] = useState<ResponseMode>(storeContext.response_mode);

  const handleSave = () => {
    // Update store + localStorage immediately (optimistic)
    setContext({ language, response_mode: responseMode });

    // Sync to backend session in the background
    if (activeSessionId) {
      patchSessionContext(activeSessionId, {
        language,
        response_mode: responseMode,
      }).catch((err) => console.warn('Failed to sync preferences to session:', err));
    }

    navigate('/');
  };

  return (
    <Flex
      minH="100vh"
      direction="column"
      style={{ backgroundImage: appGradient }}
    >
      {/* Header */}
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
            <Heading
              as="h1"
              size="md"
              fontWeight="bold"
              color="white"
              cursor="pointer"
              onClick={() => navigate('/')}
            >
              <Flex align="center" gap={2}>
                <Image src="/favicon.svg" alt="mishmish.ai logo" boxSize="24px" />
                mishmish.ai
              </Flex>
            </Heading>
          </Flex>
        </Container>
      </Box>

      {/* Content */}
      <Flex flex={1} align="center" justify="center" px={4}>
        <Box
          w="full"
          maxW="md"
          bg="white/10"
          backdropFilter="blur(12px)"
          borderRadius="2xl"
          p={{ base: 6, md: 8 }}
          border="1px solid"
          borderColor="white/20"
        >
          <Heading as="h2" size="lg" color="white" mb={6}>
            Settings
          </Heading>

          <VStack gap={6} align="stretch">
              <Field label={<Text color="white/90" fontWeight="medium">Language</Text>}>
                <NativeSelect.Root>
                  <NativeSelect.Field
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    bg="white/90"
                    color="gray.900"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.value} value={lang.value}>
                        {lang.label}
                      </option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field>

              <Field label={<Text color="white/90" fontWeight="medium">Response Mode</Text>}>
                <NativeSelect.Root>
                  <NativeSelect.Field
                    value={responseMode}
                    onChange={(e) => setResponseMode(e.target.value as ResponseMode)}
                    bg="white/90"
                    color="gray.900"
                  >
                    {RESPONSE_MODES.map((mode) => (
                      <option key={mode.value} value={mode.value}>
                        {mode.label} — {mode.description}
                      </option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </Field>

              <Flex gap={3} pt={2}>
                <Button
                  flex={1}
                  variant="ghost"
                  color="white"
                  _hover={{ bg: 'white/10' }}
                  onClick={() => navigate('/')}
                >
                  Cancel
                </Button>
                <Button
                  flex={1}
                  bg="accent.400"
                  color="gray.900"
                  _hover={{ bg: 'accent.500' }}
                  onClick={handleSave}
                >
                  Save
                </Button>
              </Flex>
            </VStack>
        </Box>
      </Flex>
    </Flex>
  );
}

export default SettingsPage;
