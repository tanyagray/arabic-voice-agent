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
    message_content: content,
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
