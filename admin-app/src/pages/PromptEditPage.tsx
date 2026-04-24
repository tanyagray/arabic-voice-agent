import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import {
  Alert, Badge, Box, Button, Dialog, Flex, Heading, IconButton, Portal,
  Text, Textarea, Spinner, VStack,
} from '@chakra-ui/react'
import { FiTrash2 } from 'react-icons/fi'
import apiClient from '../lib/api-client'
import { useLanguage } from '../hooks/useLanguage'
import { LanguageSelector } from '../components/LanguageSelector'

const PROMPT_TYPE_LABELS: Record<string, string> = {
  base: 'Base Prompt',
  scaffolding: 'Scaffolding Prompt',
  transliteration: 'Transliteration Prompt',
}

const FLOW_LABELS: Record<string, string> = {
  onboarding: 'Onboarding',
}

type FlowSection = { key: 'prompt' | 'schema' | 'examples'; label: string; helper: string; minH: number }

const FLOW_SECTIONS: FlowSection[] = [
  {
    key: 'prompt',
    label: 'Prompt',
    helper: 'Instructions sent to the model for this step. Supports placeholders like {name}, {text}.',
    minH: 320,
  },
  {
    key: 'schema',
    label: 'Response Schema',
    helper: 'JSON Schema the model response is validated against.',
    minH: 220,
  },
  {
    key: 'examples',
    label: 'Examples',
    helper: 'Few-shot examples the model can learn from. Stored as one markdown file, split on "### " headings.',
    minH: 220,
  },
]

/** Split a single examples.md file into one string per example. Splits on lines
 *  that begin with "### " (markdown h3) so each entry keeps its own heading. If
 *  the file has no h3 headings, the whole thing becomes a single example. */
function parseExamples(content: string): string[] {
  const trimmed = content.trim()
  if (!trimmed) return []
  if (!/^### /m.test(trimmed)) return [trimmed]
  // Split so each resulting chunk starts with its own "### " heading.
  const parts = trimmed.split(/(?=^### )/m).map((p) => p.trim()).filter(Boolean)
  return parts.length > 0 ? parts : [trimmed]
}

function serializeExamples(examples: string[]): string {
  const cleaned = examples.map((e) => e.trim()).filter(Boolean)
  return cleaned.length === 0 ? '' : cleaned.join('\n\n') + '\n'
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
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

type ExamplesEditorProps = {
  url: string
  label: string
  helper?: string
}

function ExamplesEditor({ url, label, helper }: ExamplesEditorProps) {
  const [examples, setExamples] = useState<string[]>([])
  const [savedExamples, setSavedExamples] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<number | null>(null)

  const hasChanges =
    examples.length !== savedExamples.length ||
    examples.some((e, i) => e !== savedExamples[i])

  const fetchContent = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await apiClient.get<{ content: string }>(url)
      const parsed = parseExamples(res.data.content)
      setExamples(parsed)
      setSavedExamples(parsed)
    } catch {
      setError('Failed to load')
    } finally {
      setLoading(false)
    }
  }, [url])

  useEffect(() => {
    fetchContent()
  }, [fetchContent])

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const content = serializeExamples(examples)
      await apiClient.put(url, { content })
      setSavedExamples([...examples])
      setSuccessMsg('Saved')
    } catch {
      setError('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  function updateExample(i: number, value: string) {
    setExamples((prev) => prev.map((e, idx) => (idx === i ? value : e)))
  }

  function addExample() {
    const nextNumber = examples.length + 1
    const template = `### Example ${nextNumber} — \n`
    setExamples((prev) => [...prev, template])
  }

  function confirmDelete(i: number) {
    setExamples((prev) => prev.filter((_, idx) => idx !== i))
    setPendingDelete(null)
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
        <Text fontSize="xs" color="gray.500" mb={3}>{helper}</Text>
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
        <VStack align="stretch" gap={3}>
          {examples.length === 0 && (
            <Text fontSize="sm" color="gray.500">No examples yet — add one below.</Text>
          )}
          {examples.map((ex, i) => (
            <Box key={i} borderWidth="1px" borderColor="gray.200" borderRadius="md" p={3} bg="gray.50">
              <Flex align="center" gap={2} mb={2}>
                <Text fontSize="xs" color="gray.600" fontWeight="semibold">Example {i + 1}</Text>
                <Box ml="auto" />
                <IconButton
                  aria-label={`Delete example ${i + 1}`}
                  size="xs"
                  variant="ghost"
                  colorPalette="red"
                  onClick={() => setPendingDelete(i)}
                >
                  <FiTrash2 />
                </IconButton>
              </Flex>
              <Textarea
                value={ex}
                onChange={(e) => updateExample(i, e.target.value)}
                fontFamily="mono"
                fontSize="sm"
                resize="vertical"
                minH="160px"
                bg="white"
              />
            </Box>
          ))}
          <Box>
            <Button size="xs" variant="outline" onClick={addExample}>
              + Add Example
            </Button>
          </Box>
        </VStack>
      )}

      <Dialog.Root
        open={pendingDelete !== null}
        onOpenChange={(e) => { if (!e.open) setPendingDelete(null) }}
        role="alertdialog"
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Delete example?</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Text fontSize="sm">
                  This removes example {pendingDelete !== null ? pendingDelete + 1 : ''} from the list.
                  You'll still need to click <b>Save</b> for the change to be written to disk.
                </Text>
              </Dialog.Body>
              <Dialog.Footer>
                <Button variant="outline" size="sm" onClick={() => setPendingDelete(null)}>
                  Cancel
                </Button>
                <Button
                  colorPalette="red"
                  size="sm"
                  onClick={() => { if (pendingDelete !== null) confirmDelete(pendingDelete) }}
                >
                  Delete
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Box>
  )
}

export function PromptEditPage() {
  const { promptType, flow, step } = useParams<{ promptType?: string; flow?: string; step?: string }>()
  const { language, languages, loading: langLoading, setLanguage } = useLanguage()

  const isFlow = Boolean(flow && step)
  const isPerLanguage = !isFlow && promptType === 'base'

  if (langLoading) return <Box p={8}><Spinner /></Box>

  // Flow mode — stacked sections (prompt / schema / examples)
  if (isFlow) {
    const title = `${FLOW_LABELS[flow!] ?? titleCase(flow!)} · ${titleCase(step!)}`
    return (
      <Box p={6} h="100%" display="flex" flexDirection="column">
        <Flex align="center" gap={3} mb={4}>
          <Heading size="md">{title}</Heading>
        </Flex>
        <VStack align="stretch" gap={4}>
          {FLOW_SECTIONS.map((s) => {
            const url = `/admin/prompts/flows/${flow}/${step}/${s.key}`
            if (s.key === 'examples') {
              return (
                <ExamplesEditor key={s.key} url={url} label={s.label} helper={s.helper} />
              )
            }
            return (
              <SectionEditor
                key={s.key}
                url={url}
                label={s.label}
                helper={s.helper}
                minH={s.minH}
                enabled
              />
            )
          })}
        </VStack>
      </Box>
    )
  }

  // Regular single-section mode
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
