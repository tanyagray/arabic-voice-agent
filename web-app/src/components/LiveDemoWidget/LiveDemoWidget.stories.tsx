import type { Meta, StoryObj } from '@storybook/react-vite';
import { LiveDemoWidget } from './LiveDemoWidget';

const meta = {
  title: 'Components/LiveDemoWidget',
  component: LiveDemoWidget,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#1a1a2e' },
      ],
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100vw', height: '100vh', padding: '2rem' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LiveDemoWidget>;

export default meta;
type Story = StoryObj<typeof meta>;

// Note: LiveDemoWidget now creates its own SessionContext internally
// To see it work, ensure VITE_API_URL is set to point to your running API
export const Default: Story = {};
