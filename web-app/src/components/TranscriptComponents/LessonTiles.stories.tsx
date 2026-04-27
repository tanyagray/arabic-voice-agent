import type { Meta, StoryObj } from '@storybook/react-vite';
import { THEMES } from '@/pages/Landing';
import { LessonTiles, type LessonTile } from './LessonTiles';

const meta = {
  title: 'TranscriptComponents/LessonTiles',
  component: LessonTiles,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story, ctx) => {
      const theme = ctx.args.ctx.theme;
      return (
        <div
          style={{
            background: theme.bg,
            padding: 24,
            minHeight: '100vh',
            fontFamily: "'Noto Sans Arabic', 'Inter', system-ui, sans-serif",
            color: theme.ink,
          }}
        >
          <Story />
        </div>
      );
    },
  ],
} satisfies Meta<typeof LessonTiles>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleTiles: LessonTile[] = [
  { title: 'Greetings & introductions', objective: 'Say hello, ask how someone is, and introduce yourself confidently.' },
  { title: 'Ordering at a café', objective: 'Practice ordering coffee, asking about the menu, and paying the bill.' },
  { title: 'Debating current events', objective: 'Express opinions, agree and disagree, and argue your point politely.' },
];

export const Default: Story = {
  args: {
    props: {
      lessons: sampleTiles,
    },
    ctx: {
      theme: THEMES.apricot,
      isMobile: false,
      visible: true,
      onPick: (tile) => console.log('picked', tile),
    },
  },
};

export const Dark: Story = {
  args: {
    ...Default.args,
    ctx: {
      ...Default.args!.ctx,
      theme: THEMES.dark,
    },
  },
};

export const Mobile: Story = {
  args: {
    ...Default.args,
    ctx: {
      ...Default.args!.ctx,
      isMobile: true,
    },
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
};

export const MobileDark: Story = {
  args: {
    ...Default.args,
    ctx: {
      ...Default.args!.ctx,
      theme: THEMES.dark,
      isMobile: true,
    },
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
};

export const Hidden: Story = {
  args: {
    ...Default.args,
    ctx: {
      ...Default.args!.ctx,
      visible: false,
    },
  },
};

export const NoArabic: Story = {
  args: {
    props: {
      lessons: sampleTiles.map((t) => ({ ...t, arabic: null })),
    },
    ctx: Default.args!.ctx,
  },
};

export const LongContent: Story = {
  args: {
    props: {
      lessons: [
        { title: 'Navigating an airport in a foreign city', objective: 'Learn the vocabulary and phrases you need to check in, find your gate, ask for help, and handle common issues at airport security and customs.' },
        { title: 'Renting an apartment and signing a lease', objective: 'Discuss neighborhoods, ask about rent, utilities, and amenities, and understand the key vocabulary in a rental contract.' },
        { title: 'Negotiating a salary and discussing benefits', objective: 'Confidently navigate a job offer conversation, including pay, vacation, health coverage, and remote work flexibility.' },
      ],
    },
    ctx: Default.args!.ctx,
  },
};

export const ShortContent: Story = {
  args: {
    props: {
      lessons: [
        { title: 'Hello', objective: 'Say hi.' },
        { title: 'Café', objective: 'Order coffee.' },
        { title: 'Debate', objective: 'Argue politely.' },
      ],
    },
    ctx: Default.args!.ctx,
  },
};
