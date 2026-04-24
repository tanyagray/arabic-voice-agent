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

export const NameStep: Story = {
  args: { color: 'apricot' },
  parameters: { initialEntries: ['/onboarding/name'] },
};

export const MotivationStep: Story = {
  args: { color: 'apricot' },
  parameters: { initialEntries: ['/onboarding/motivation'] },
  decorators: [
    (Story) => {
      sessionStorage.setItem('mishmish:onboarding:name', 'Salma');
      return <Story />;
    },
  ],
};

export const SuggestionsStep: Story = {
  args: { color: 'apricot' },
  parameters: { initialEntries: ['/onboarding/suggestions'] },
  decorators: [
    (Story) => {
      sessionStorage.setItem('mishmish:onboarding:name', 'Salma');
      return <Story />;
    },
  ],
};
