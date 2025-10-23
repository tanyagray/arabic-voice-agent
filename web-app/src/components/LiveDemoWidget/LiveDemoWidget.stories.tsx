import type { Meta, StoryObj } from '@storybook/react-vite';
import { LiveDemoWidget } from './LiveDemoWidget';

const meta = {
  title: 'Components/LiveDemoWidget',
  component: LiveDemoWidget,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#1a1a2e' },
      ],
    },
  },
} satisfies Meta<typeof LiveDemoWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
