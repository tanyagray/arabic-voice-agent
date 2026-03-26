import type { Meta, StoryObj } from '@storybook/react-vite';
import { Transcript, type TranscriptMessage } from './Transcript';

const meta = {
  title: 'Components/Transcript',
  component: Transcript,
  parameters: {
    layout: 'padded',
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#1a1a2e' }],
    },
  },
  args: {
    messages: [],
  },
  decorators: [
    (Story) => (
      <div style={{ height: '400px', width: '100%' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Transcript>;

export default meta;
type Story = StoryObj<typeof meta>;

const MOCK_SESSION_ID = '550e8400-e29b-41d4-a716-446655440000';
const MOCK_USER_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

/** Helper to create a mock TranscriptMessage with random timestamp offset (2-15s) */
function createMessage(
  source: 'user' | 'tutor' | 'system',
  content: string
): TranscriptMessage {
  const offsetMs = Math.floor(Math.random() * 13000) + 2000;
  const timestamp = new Date(Date.now() - offsetMs).toISOString();
  return {
    message_id: crypto.randomUUID(),
    session_id: MOCK_SESSION_ID,
    user_id: MOCK_USER_ID,
    message_source: source,
    message_kind: 'text',
    message_text: content,
    created_at: timestamp,
    updated_at: timestamp,
  };
}

const sampleMessages: TranscriptMessage[] = [
  createMessage('tutor', 'مرحبا! كيف حالك اليوم؟'),
  createMessage('user', 'أنا بخير، شكرا! أريد أن أتعلم اللغة العربية.'),
  createMessage('tutor', 'ممتاز! سأساعدك في تعلم اللغة العربية. ما هو مستواك الحالي؟'),
  createMessage('user', 'أنا مبتدئ تماما.'),
  createMessage('tutor', 'لا مشكلة! سنبدأ من الأساسيات. دعنا نتعلم الحروف الأبجدية أولاً.'),
];

export const Default: Story = {
  args: {
    messages: sampleMessages,
  },
};

export const Empty: Story = {
  args: {
    messages: [],
  },
};

export const EmptyWithCustomText: Story = {
  args: {
    messages: [],
    emptyText: 'Start a conversation to see messages here',
  },
};

export const SingleUserMessage: Story = {
  args: {
    messages: [createMessage('user', 'Hello, I would like to practice Arabic.')],
  },
};

export const SingleAgentMessage: Story = {
  args: {
    messages: [createMessage('tutor', 'مرحبا بك! كيف يمكنني مساعدتك اليوم؟')],
  },
};

export const LongConversation: Story = {
  args: {
    messages: [
      createMessage('tutor', 'مرحبا!'),
      createMessage('user', 'مرحبا!'),
      createMessage('tutor', 'كيف حالك؟'),
      createMessage('user', 'أنا بخير، وأنت؟'),
      createMessage('tutor', 'أنا بخير أيضا، شكرا!'),
      createMessage('tutor', 'ماذا تريد أن تتعلم اليوم؟'),
      createMessage('user', 'أريد أن أتعلم المفردات الجديدة.'),
      createMessage('tutor', 'ممتاز! دعنا نبدأ.'),
      createMessage('tutor', 'الكلمة الأولى هي "كتاب"'),
      createMessage('user', 'كتاب'),
    ],
  },
};

export const LongMessages: Story = {
  args: {
    messages: [
      createMessage(
        'tutor',
        'مرحبا بك في درس اللغة العربية! اليوم سنتعلم عن الأفعال في اللغة العربية وكيفية تصريفها في الأزمنة المختلفة. الأفعال في اللغة العربية تنقسم إلى ثلاثة أقسام: الماضي والمضارع والأمر.'
      ),
      createMessage(
        'user',
        'شكرا جزيلا على هذا الشرح المفصل! هل يمكنك أن تعطيني بعض الأمثلة على الأفعال في الزمن الماضي؟ أريد أن أفهم كيف تتغير نهايات الأفعال حسب الفاعل.'
      ),
    ],
  },
};

export const MarkdownFormatting: Story = {
  args: {
    messages: [
      createMessage('user', 'Can you show me text formatting?'),
      createMessage(
        'tutor',
        'Of course! Here are some examples:\n\n**Bold text** is used for emphasis. *Italic text* is used for subtle emphasis. You can also use ~~strikethrough~~ for corrections.\n\nYou can combine them: ***bold and italic*** together.\n\nInline code looks like `const x = 42` in a sentence.'
      ),
    ],
  },
};

export const MarkdownCodeBlock: Story = {
  args: {
    messages: [
      createMessage('user', 'Show me a code example'),
      createMessage(
        'tutor',
        'Here is a Python function that greets in Arabic:\n\n```python\ndef greet(name: str) -> str:\n    """Greet someone in Arabic."""\n    return f"مرحبا {name}! كيف حالك؟"\n\nprint(greet("أحمد"))\n```\n\nAnd here is the same in JavaScript:\n\n```javascript\nfunction greet(name) {\n  return `مرحبا ${name}! كيف حالك؟`;\n}\n\nconsole.log(greet("أحمد"));\n```\n\nTry running either example!'
      ),
    ],
  },
};

export const MarkdownTable: Story = {
  args: {
    messages: [
      createMessage('user', 'What are some common Arabic words?'),
      createMessage(
        'tutor',
        'Here are some essential vocabulary words:\n\n| العربية | Transliteration | English |\n|---|---|---|\n| كتاب | kitāb | Book |\n| قلم | qalam | Pen |\n| مدرسة | madrasa | School |\n| بيت | bayt | House |\n| ماء | māʾ | Water |\n| طعام | ṭaʿām | Food |\n\nTry to memorize these words!'
      ),
    ],
  },
};

export const MarkdownLists: Story = {
  args: {
    messages: [
      createMessage('user', 'How do I learn Arabic effectively?'),
      createMessage(
        'tutor',
        'Here are my top recommendations:\n\n## Study Plan\n\n1. **Start with the alphabet** — learn all 28 letters\n2. **Learn basic greetings** — practice daily\n3. **Build vocabulary** — aim for 10 new words per day\n4. **Practice speaking** — find a conversation partner\n\n## Useful Resources\n\n- Online courses and apps\n- Arabic podcasts for beginners\n- Children\'s books in Arabic\n- Language exchange communities\n\n## Things to Avoid\n\n- Don\'t skip the fundamentals\n- Don\'t try to learn too fast\n- Don\'t neglect pronunciation practice'
      ),
    ],
  },
};

export const MarkdownHeadingsAndBlockquotes: Story = {
  args: {
    messages: [
      createMessage('user', 'Tell me about Arabic grammar'),
      createMessage(
        'tutor',
        '# Arabic Grammar Overview\n\nArabic grammar (النحو) is rich and systematic.\n\n## Sentence Types\n\nThere are two main sentence types:\n\n### Nominal Sentence (الجملة الاسمية)\n\nStarts with a noun or pronoun.\n\n> الكتاب جميل\n> "The book is beautiful"\n\n### Verbal Sentence (الجملة الفعلية)\n\nStarts with a verb.\n\n> كتب الطالب الدرس\n> "The student wrote the lesson"\n\n---\n\nRemember: Arabic reads **right to left**, which also affects sentence structure!'
      ),
    ],
  },
};

export const MarkdownImage: Story = {
  args: {
    messages: [
      createMessage('user', 'Show me the Arabic alphabet'),
      createMessage(
        'tutor',
        'Here is the Arabic alphabet chart:\n\n![Arabic Alphabet](https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Arabic_alphabet_world_map.svg/400px-Arabic_alphabet_world_map.svg.png)\n\nThe Arabic alphabet has **28 letters**, all of which are consonants. Vowels are represented by diacritical marks (حركات) placed above or below the letters.'
      ),
    ],
  },
};

export const MarkdownLinks: Story = {
  args: {
    messages: [
      createMessage('user', 'Where can I find more resources?'),
      createMessage(
        'tutor',
        'Here are some great resources for learning Arabic:\n\n- [Arabic on Wikipedia](https://en.wikipedia.org/wiki/Arabic) — comprehensive overview\n- [Aljazeera Learning](https://learning.aljazeera.net/) — news-based learning\n\nYou can also search for `arabic learning resources` online for more options.\n\n> **Tip:** Consistency is more important than intensity. Study a little every day!'
      ),
    ],
  },
};

export const MarkdownRichConversation: Story = {
  decorators: [
    (Story) => (
      <div style={{ height: '600px', width: '100%' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    messages: [
      createMessage('tutor', 'مرحبا! اليوم سنتعلم عن **الأفعال** في اللغة العربية.'),
      createMessage('user', 'Sounds great! What are the verb forms?'),
      createMessage(
        'tutor',
        '## الأفعال العربية (Arabic Verbs)\n\nArabic verbs have three main tenses:\n\n| الزمن | Tense | Example | Translation |\n|---|---|---|---|\n| الماضي | Past | **كَتَبَ** | He wrote |\n| المضارع | Present | **يَكْتُبُ** | He writes |\n| الأمر | Imperative | **اُكْتُبْ** | Write! |\n\n> All Arabic verbs are built on a **root system** of 3 consonants (الجذر الثلاثي)'
      ),
      createMessage('user', 'Can you show me how the root system works?'),
      createMessage(
        'tutor',
        'The root system is the foundation of Arabic! Take the root **ك-ت-ب** (k-t-b), meaning *writing*:\n\n1. **كَتَبَ** — he wrote\n2. **كِتَاب** — a book\n3. **مَكْتَبَة** — a library\n4. **كَاتِب** — a writer\n5. **مَكْتُوب** — something written\n\nAll derived from the same 3 letters! Here\'s a visualization:\n\n```\nRoot: ك-ت-ب (k-t-b)\n  ├── كَتَبَ    (kataba)    → verb: wrote\n  ├── كِتَاب   (kitāb)     → noun: book\n  ├── مَكْتَبَة (maktaba)   → noun: library\n  ├── كَاتِب   (kātib)     → noun: writer\n  └── مَكْتُوب (maktūb)    → adj: written\n```\n\nThis pattern applies to *thousands* of Arabic words!'
      ),
    ],
  },
};
