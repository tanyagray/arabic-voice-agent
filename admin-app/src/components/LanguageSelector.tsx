import { NativeSelect, Box } from '@chakra-ui/react'

interface LanguageSelectorProps {
  language: string
  languages: string[]
  onChange: (lang: string) => void
}

export function LanguageSelector({ language, languages, onChange }: LanguageSelectorProps) {
  return (
    <Box maxW="200px">
      <NativeSelect.Root size="sm">
        <NativeSelect.Field
          value={language}
          onChange={(e) => onChange(e.target.value)}
        >
          {languages.map((lang) => (
            <option key={lang} value={lang}>{lang}</option>
          ))}
        </NativeSelect.Field>
      </NativeSelect.Root>
    </Box>
  )
}
