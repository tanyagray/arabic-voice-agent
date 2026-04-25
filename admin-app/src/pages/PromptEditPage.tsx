import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import {
  Alert, Badge, Box, Button, Flex, Heading, Text, Textarea, Spinner,
} from '@chakra-ui/react'
import apiClient from '../lib/api-client'
import { useLanguage } from '../hooks/useLanguage'
import { LanguageSelector } from '../components/LanguageSelector'

const PROMPT_TYPE_LABELS: Record<string, string> = {
  base: 'Base Prompt',
  scaffolding: 'Scaffolding Prompt',
  transliteration: 'Transliteration Prompt',
  onboarding: 'Onboarding Prompt',
}

type SectionEditorProps = {
  url: string
  label: string
  helper?: string
  minH?: number
  enabled: boolean
}

function SectionEditor({ url, label, helper, minH = 240, enabled }: SectionEditorProps) {
  const [content, setContent] = useState('')
  const [savedContent, setSavedContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const hasChanges = content !== savedContent

  const fetchContent = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await apiClient.get<{ content: string }>(url)
      setContent(res.data.content)
      setSavedContent(res.data.content)
    } catch {
      setError('Failed to load')
    } finally {
      setLoading(false)
    }
  }, [url, enabled])

  useEffect(() => {
    fetchContent()
  }, [fetchContent])

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccessMsg(null)
    try {
      await apiClient.put(url, { content })
      setSavedContent(content)
      setSuccessMsg('Saved')
    } catch {
      setError('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box bg="white" borderRadius="md" borderWidth="1px" borderColor="gray.200" p={4}>
      <Flex align="center" gap={3} mb={2}>
        <Heading size="sm">
          {label}
          {hasChanges && <Badge ml={2} colorPalette="orange">Unsaved</Badge>}
        </Heading>
        <Box ml="auto" />
        <Button colorPalette="blue" size="xs" onClick={handleSave} loading={saving} disabled={!hasChanges}>
          Save
        </Button>
      </Flex>
      {helper && (
        <Text fontSize="xs" color="gray.500" mb={2}>{helper}</Text>
      )}
      {error && (
        <Alert.Root status="error" mb={2} borderRadius="md" size="sm">
          <Alert.Description>{error}</Alert.Description>
        </Alert.Root>
      )}
      {successMsg && (
        <Alert.Root status="success" mb={2} borderRadius="md" size="sm">
          <Alert.Description>{successMsg}</Alert.Description>
        </Alert.Root>
      )}
      {loading ? (
        <Box py={6}><Spinner size="sm" /></Box>
      ) : (
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          fontFamily="mono"
          fontSize="sm"
          resize="vertical"
          minH={`${minH}px`}
          bg="white"
        />
      )}
    </Box>
  )
}

export function PromptEditPage() {
  const { promptType } = useParams<{ promptType?: string }>()
  const { language, languages, loading: langLoading, setLanguage } = useLanguage()

  const isPerLanguage = promptType === 'base'

  if (langLoading) return <Box p={8}><Spinner /></Box>

  const title = PROMPT_TYPE_LABELS[promptType || ''] || 'Prompt'
  const promptUrl = isPerLanguage
    ? `/admin/prompts/base/${language}`
    : `/admin/prompts/${promptType}`
  const enabled = isPerLanguage ? Boolean(language) : Boolean(promptType)

  return (
    <Box p={6} h="100%" display="flex" flexDirection="column">
      <Flex align="center" gap={3} mb={4}>
        <Heading size="md">{title}</Heading>
        <Box ml="auto" />
        {isPerLanguage && (
          <LanguageSelector language={language} languages={languages} onChange={setLanguage} />
        )}
      </Flex>
      <SectionEditor
        key={promptUrl}
        url={promptUrl}
        label={title}
        minH={500}
        enabled={enabled}
      />
    </Box>
  )
}
