import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Alert, Badge, Box, Button, Flex, Heading, Text, Textarea, Spinner
} from '@chakra-ui/react'
import apiClient from '../lib/api-client'

export function PromptEditPage() {
  const { language } = useParams<{ language: string }>()
  const [content, setContent] = useState('')
  const [savedContent, setSavedContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const hasChanges = content !== savedContent

  useEffect(() => {
    if (!language) return
    apiClient.get<{ content: string }>(`/admin/prompts/${language}`)
      .then((res) => {
        setContent(res.data.content)
        setSavedContent(res.data.content)
      })
      .catch(() => setError('Failed to load prompt'))
      .finally(() => setLoading(false))
  }, [language])

  async function handleSave() {
    if (!language) return
    setSaving(true)
    setError(null)
    setSuccessMsg(null)
    try {
      await apiClient.put(`/admin/prompts/${language}`, { content })
      setSavedContent(content)
      setSuccessMsg('Saved successfully')
    } catch {
      setError('Failed to save prompt')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Box p={8}><Spinner /></Box>

  return (
    <Box p={6} h="100%" display="flex" flexDirection="column">
      <Flex align="center" gap={3} mb={4}>
        <Link to="/prompts">
          <Text color="blue.500" fontSize="sm">← Back</Text>
        </Link>
        <Heading size="md">
          {language}
          {hasChanges && <Badge ml={2} colorPalette="orange">Unsaved changes</Badge>}
        </Heading>
        <Button ml="auto" colorPalette="blue" size="sm" onClick={handleSave} loading={saving} disabled={!hasChanges}>
          Save
        </Button>
      </Flex>

      {error && (
        <Alert.Root status="error" mb={3} borderRadius="md">
          <Alert.Description>{error}</Alert.Description>
        </Alert.Root>
      )}
      {successMsg && (
        <Alert.Root status="success" mb={3} borderRadius="md">
          <Alert.Description>{successMsg}</Alert.Description>
        </Alert.Root>
      )}

      <Flex gap={4} flex={1} overflow="hidden">
        {/* Editor */}
        <Box flex={1} display="flex" flexDirection="column">
          <Text fontSize="xs" fontWeight="semibold" color="gray.500" mb={1} textTransform="uppercase">Editor</Text>
          <Textarea
            flex={1}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            fontFamily="mono"
            fontSize="sm"
            resize="none"
            h="100%"
            minH="500px"
            bg="white"
          />
        </Box>

        {/* Preview */}
        <Box flex={1} display="flex" flexDirection="column">
          <Text fontSize="xs" fontWeight="semibold" color="gray.500" mb={1} textTransform="uppercase">Preview</Text>
          <Box
            flex={1}
            p={4}
            bg="white"
            border="1px solid"
            borderColor="gray.200"
            borderRadius="md"
            overflowY="auto"
            minH="500px"
            fontFamily="mono"
            fontSize="sm"
            whiteSpace="pre-wrap"
          >
            {content}
          </Box>
        </Box>
      </Flex>
    </Box>
  )
}
