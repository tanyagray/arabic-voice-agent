import type { Meta, StoryObj } from '@storybook/react-vite';
import Landing from './Landing';

const meta = {
  title: 'Pages/Landing',
  component: Landing,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Landing>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ReturningUser: Story = {
  args: { userState: 'returning', color: 'apricot' },
};
