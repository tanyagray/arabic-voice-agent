import type { Meta, StoryObj } from '@storybook/react-vite';
import Onboarding from './Onboarding';

const meta = {
  title: 'Pages/Onboarding',
  component: Onboarding,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Onboarding>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { color: 'apricot' },
  parameters: { initialEntries: ['/onboarding'] },
};
