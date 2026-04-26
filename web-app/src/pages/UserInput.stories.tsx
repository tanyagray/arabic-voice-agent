import type { Meta, StoryObj } from '@storybook/react-vite';
import { THEMES, UserInput } from './Landing';

const meta = {
  title: 'Pages/UserInput',
  component: UserInput,
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <div style={{ width: 720, padding: 24, background: THEMES.apricot.bg }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof UserInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {
  args: {
    theme: THEMES.apricot,
    isMobile: false,
    prefilled: 'Tanya',
    autoFocus: false,
    onSubmit: () => {},
    onMicClick: () => {},
    disabled: false,
  },
};

export const Sending: Story = {
  args: {
    theme: THEMES.apricot,
    isMobile: false,
    prefilled: 'Tanya',
    autoFocus: false,
    onSubmit: () => {},
    onMicClick: () => {},
    disabled: true,
  },
};
