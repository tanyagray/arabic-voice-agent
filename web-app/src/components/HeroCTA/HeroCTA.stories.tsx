import type { Meta, StoryObj } from '@storybook/react-vite';
import { HeroCTA } from './HeroCTA';

const meta = {
  title: 'Components/HeroCTA',
  component: HeroCTA,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#6B46C1' },
      ],
    },
  },
  argTypes: {
    showDemo: {
      control: 'boolean',
      description: 'Whether the demo is currently shown',
    },
    onChatNowClick: {
      action: 'chatNowClicked',
      description: 'Callback function when Chat Now button is clicked',
    },
  },
} satisfies Meta<typeof HeroCTA>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    showDemo: false,
    onChatNowClick: () => {},
  },
};
