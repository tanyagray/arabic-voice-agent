import type { Meta, StoryObj } from '@storybook/react-vite';
import { Transcript } from './Transcript';

const meta = {
  title: 'Components/Transcript',
  component: Transcript,
  parameters: {
    layout: 'padded',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#1a1a2e' },
      ],
    },
  },
} satisfies Meta<typeof Transcript>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
