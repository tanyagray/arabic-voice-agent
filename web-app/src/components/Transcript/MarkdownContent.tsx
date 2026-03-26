import type { ComponentPropsWithoutRef } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Box,
  Code,
  Heading,
  Image,
  Link,
  List,
  Separator,
  Table,
  Text,
} from '@chakra-ui/react';

const components: Components = {
  p: ({ children }) => (
    <Text fontSize="lg" lineHeight="relaxed" mb={2} _last={{ mb: 0 }}>
      {children}
    </Text>
  ),
  strong: ({ children }) => (
    <Text as="strong" fontWeight="bold">
      {children}
    </Text>
  ),
  em: ({ children }) => (
    <Text as="em" fontStyle="italic">
      {children}
    </Text>
  ),
  del: ({ children }) => <Text as="del">{children}</Text>,
  a: ({ href, children }) => (
    <Link
      href={href}
      color="primary.300"
      textDecoration="underline"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </Link>
  ),
  h1: ({ children }) => (
    <Heading as="h1" size="xl" mt={3} mb={2}>
      {children}
    </Heading>
  ),
  h2: ({ children }) => (
    <Heading as="h2" size="lg" mt={3} mb={2}>
      {children}
    </Heading>
  ),
  h3: ({ children }) => (
    <Heading as="h3" size="md" mt={2} mb={1}>
      {children}
    </Heading>
  ),
  h4: ({ children }) => (
    <Heading as="h4" size="sm" mt={2} mb={1}>
      {children}
    </Heading>
  ),
  h5: ({ children }) => (
    <Heading as="h5" size="xs" mt={2} mb={1}>
      {children}
    </Heading>
  ),
  h6: ({ children }) => (
    <Heading as="h6" size="xs" mt={2} mb={1}>
      {children}
    </Heading>
  ),
  ul: ({ children }) => (
    <List.Root as="ul" ps={5} mb={2}>
      {children}
    </List.Root>
  ),
  ol: ({ children }) => (
    <List.Root as="ol" ps={5} mb={2} listStyleType="decimal">
      {children}
    </List.Root>
  ),
  li: ({ children }) => (
    <List.Item fontSize="lg" mb={1}>
      {children}
    </List.Item>
  ),
  blockquote: ({ children }) => (
    <Box
      borderLeftWidth="3px"
      borderColor="white/40"
      ps={3}
      opacity={0.85}
      mb={2}
    >
      {children}
    </Box>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = typeof className === 'string' && className.startsWith('language-');
    if (isBlock) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }
    return (
      <Code
        bg="white/10"
        color="primary.200"
        px={1}
        py={0.5}
        borderRadius="sm"
        fontSize="md"
      >
        {children}
      </Code>
    );
  },
  pre: ({ children }) => (
    <Box
      as="pre"
      bg="black/40"
      p={3}
      borderRadius="md"
      overflowX="auto"
      mb={2}
      fontSize="sm"
      fontFamily="mono"
      dir="ltr"
      textAlign="left"
    >
      {children}
    </Box>
  ),
  table: ({ children }) => (
    <Box overflowX="auto" mb={2}>
      <Table.Root size="sm" fontSize="md" bg="transparent">
        {children}
      </Table.Root>
    </Box>
  ),
  thead: ({ children }) => (
    <Table.Header borderBottom="1px solid" borderColor="white/30" bg="transparent">
      {children}
    </Table.Header>
  ),
  tbody: ({ children }) => <Table.Body bg="transparent">{children}</Table.Body>,
  tr: ({ children }) => <Table.Row bg="transparent" _hover={{ bg: 'white/5' }}>{children}</Table.Row>,
  th: ({ children }) => (
    <Table.ColumnHeader fontWeight="bold" px={2} py={1} textAlign="start" bg="transparent" color="inherit">
      {children}
    </Table.ColumnHeader>
  ),
  td: ({ children }) => (
    <Table.Cell px={2} py={1} borderBottom="1px solid" borderColor="white/10" bg="transparent" color="inherit">
      {children}
    </Table.Cell>
  ),
  hr: () => <Separator my={3} borderColor="white/30" />,
  img: ({ src, alt }) => (
    <Image
      src={src}
      alt={alt}
      maxW="100%"
      maxH="300px"
      objectFit="contain"
      borderRadius="md"
      my={2}
    />
  ),
};

export interface MarkdownContentProps
  extends Omit<ComponentPropsWithoutRef<typeof Box>, 'children'> {
  children: string;
}

export function MarkdownContent({ children, ...props }: MarkdownContentProps) {
  return (
    <Box color="white" {...props}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </Box>
  );
}
