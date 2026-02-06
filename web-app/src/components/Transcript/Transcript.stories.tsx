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

const sampleMessages: TranscriptMessage[] = [
  {
    id: '1',
    text: 'مرحبا! كيف حالك اليوم؟',
    isUser: false,
    timestamp: Date.now() - 60000,
  },
  {
    id: '2',
    text: 'أنا بخير، شكرا! أريد أن أتعلم اللغة العربية.',
    isUser: true,
    timestamp: Date.now() - 50000,
  },
  {
    id: '3',
    text: 'ممتاز! سأساعدك في تعلم اللغة العربية. ما هو مستواك الحالي؟',
    isUser: false,
    timestamp: Date.now() - 40000,
  },
  {
    id: '4',
    text: 'أنا مبتدئ تماما.',
    isUser: true,
    timestamp: Date.now() - 30000,
  },
  {
    id: '5',
    text: 'لا مشكلة! سنبدأ من الأساسيات. دعنا نتعلم الحروف الأبجدية أولاً.',
    isUser: false,
    timestamp: Date.now() - 20000,
  },
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
    messages: [
      {
        id: '1',
        text: 'Hello, I would like to practice Arabic.',
        isUser: true,
        timestamp: Date.now(),
      },
    ],
  },
};

export const SingleAgentMessage: Story = {
  args: {
    messages: [
      {
        id: '1',
        text: 'مرحبا بك! كيف يمكنني مساعدتك اليوم؟',
        isUser: false,
        timestamp: Date.now(),
      },
    ],
  },
};

export const LongConversation: Story = {
  args: {
    messages: [
      { id: '1', text: 'مرحبا!', isUser: false, timestamp: Date.now() - 100000 },
      { id: '2', text: 'مرحبا!', isUser: true, timestamp: Date.now() - 90000 },
      { id: '3', text: 'كيف حالك؟', isUser: false, timestamp: Date.now() - 80000 },
      { id: '4', text: 'أنا بخير، وأنت؟', isUser: true, timestamp: Date.now() - 70000 },
      { id: '5', text: 'أنا بخير أيضا، شكرا!', isUser: false, timestamp: Date.now() - 60000 },
      { id: '6', text: 'ماذا تريد أن تتعلم اليوم؟', isUser: false, timestamp: Date.now() - 50000 },
      { id: '7', text: 'أريد أن أتعلم المفردات الجديدة.', isUser: true, timestamp: Date.now() - 40000 },
      { id: '8', text: 'ممتاز! دعنا نبدأ.', isUser: false, timestamp: Date.now() - 30000 },
      { id: '9', text: 'الكلمة الأولى هي "كتاب"', isUser: false, timestamp: Date.now() - 20000 },
      { id: '10', text: 'كتاب', isUser: true, timestamp: Date.now() - 10000 },
    ],
  },
};

export const LongMessages: Story = {
  args: {
    messages: [
      {
        id: '1',
        text: 'مرحبا بك في درس اللغة العربية! اليوم سنتعلم عن الأفعال في اللغة العربية وكيفية تصريفها في الأزمنة المختلفة. الأفعال في اللغة العربية تنقسم إلى ثلاثة أقسام: الماضي والمضارع والأمر.',
        isUser: false,
        timestamp: Date.now() - 20000,
      },
      {
        id: '2',
        text: 'شكرا جزيلا على هذا الشرح المفصل! هل يمكنك أن تعطيني بعض الأمثلة على الأفعال في الزمن الماضي؟ أريد أن أفهم كيف تتغير نهايات الأفعال حسب الفاعل.',
        isUser: true,
        timestamp: Date.now() - 10000,
      },
    ],
  },
};
