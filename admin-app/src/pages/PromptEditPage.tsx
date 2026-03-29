import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import {
  Alert, Badge, Box, Button, Flex, Heading, Textarea, Spinner
} from '@chakra-ui/react'
import apiClient from '../lib/api-client'
import { useLanguage } from '../hooks/useLanguage'
import { LanguageSelector } from '../components/LanguageSelector'

const PROMPT_TYPE_LABELS: Record<string, string> = {
  base: 'Base Prompt',
  scaffolding: 'Scaffolding Prompt',
  transliteration: 'Transliteration Prompt',
}

export function PromptEditPage() {
  const { promptType } = useParams<{ promptType: string }>()
  const { language, languages, loading: langLoading, setLanguage } = useLanguage()

  const [content, setContent] = useState('')
  const [savedContent, setSavedContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const hasChanges = content !== savedContent
  const isPerLanguage = promptType === 'base'

  const fetchPrompt = useCallback(async () => {
    if (!promptType) return
    if (isPerLanguage && !language) return

    setLoading(true)
    setError(null)
    setSuccessMsg(null)

    const url = isPerLanguage
      ? `/admin/prompts/base/${language}`
      : `/admin/prompts/${promptType}`

    try {
      const res = await apiClient.get<{ content: string }>(url)
      setContent(res.data.content)
      setSavedContent(res.data.content)
    } catch {
      setError('Failed to load prompt')
    } finally {
      setLoading(false)
    }
  }, [promptType, language, isPerLanguage])

  useEffect(() => {
    if (!langLoading) {
      fetchPrompt()
    }
  }, [fetchPrompt, langLoading])

  async function handleSave() {
    if (!promptType) return
    setSaving(true)
    setError(null)
    setSuccessMsg(null)

    const url = isPerLanguage
      ? `/admin/prompts/base/${language}`
      : `/admin/prompts/${promptType}`

    try {
      await apiClient.put(url, { content })
      setSavedContent(content)
      setSuccessMsg('Saved successfully')
    } catch {
      setError('Failed to save prompt')
    } finally {
      setSaving(false)
    }
  }

  const title = PROMPT_TYPE_LABELS[promptType || ''] || 'Prompt'

  if (langLoading) return <Box p={8}><Spinner /></Box>

  return (
    <Box p={6} h="100%" display="flex" flexDirection="column">
      <Flex align="center" gap={3} mb={4}>
        <Heading size="md">
          {title}
          {hasChanges && <Badge ml={2} colorPalette="orange">Unsaved changes</Badge>}
        </Heading>
        <Box ml="auto" />
        <LanguageSelector language={language} languages={languages} onChange={setLanguage} />
        <Button colorPalette="blue" size="sm" onClick={handleSave} loading={saving} disabled={!hasChanges}>
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

      {loading ? (
        <Box p={8}><Spinner /></Box>
      ) : (
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
      )}
    </Box>
  )
}
