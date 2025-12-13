import type { Meta, StoryObj } from '@storybook/react-vite';
import { SessionList } from './SessionList';

const meta = {
  title: 'Components/SessionList',
  component: SessionList,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#1a1a2e' },
      ],
    },
  },
  argTypes: {
    onSessionSelect: {
      description: 'Callback when a session is selected',
    },
    isLoading: {
      description: 'Whether sessions are being loaded',
      control: 'boolean',
    },
    width: {
      description: 'Width of the component (default: "300px")',
      control: 'text',
    },
    height: {
      description: 'Height of the component (default: "100%")',
      control: 'text',
    },
  },
} satisfies Meta<typeof SessionList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onSessionSelect: (sessionId: string) => {
      console.log('Selected session:', sessionId);
    },
    isLoading: false,
  },
};
