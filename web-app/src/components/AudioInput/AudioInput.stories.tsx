import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { AudioInput } from './AudioInput';

const meta = {
  title: 'Atoms/AudioInput',
  component: AudioInput,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#1a1a2e' },
      ],
    },
  },
  argTypes: {
    isActive: {
      control: 'boolean',
      description: 'Whether audio input mode is active',
    },
    state: {
      control: 'select',
      options: ['idle', 'listening', 'thinking', 'speaking'],
      description: 'Current agent state',
    },
  },
  args: {
    onActivate: fn(),
    onDeactivate: fn(),
  },
} satisfies Meta<typeof AudioInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isActive: true,
    state: 'idle',
  },
};
