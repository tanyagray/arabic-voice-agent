import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Box, Card, Heading, SimpleGrid, Text, Spinner, Alert } from '@chakra-ui/react'
import apiClient from '../lib/api-client'

export function PromptsPage() {
  const [languages, setLanguages] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiClient.get<string[]>('/admin/prompts')
      .then((res) => setLanguages(res.data))
      .catch(() => setError('Failed to load prompts'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Box p={8}><Spinner /></Box>
  if (error) return <Box p={8}><Alert.Root status="error"><Alert.Description>{error}</Alert.Description></Alert.Root></Box>

  return (
    <Box p={8}>
      <Heading size="lg" mb={6}>Language Prompts</Heading>
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
        {languages.map((lang) => (
          <Link key={lang} to={`/prompts/${lang}`}>
            <Card.Root _hover={{ boxShadow: 'md', bg: 'blue.50' }} cursor="pointer" transition="all 0.15s">
              <Card.Body p={5}>
                <Text fontWeight="semibold" fontSize="lg">{lang}</Text>
                <Text fontSize="sm" color="gray.500" mt={1}>Click to edit</Text>
              </Card.Body>
            </Card.Root>
          </Link>
        ))}
      </SimpleGrid>
    </Box>
  )
}
