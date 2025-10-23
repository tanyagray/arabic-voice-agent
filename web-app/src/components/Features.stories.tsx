import type { Meta, StoryObj } from '@storybook/react-vite';
import { Features } from './Features';

const meta = {
  title: 'Components/Features',
  component: Features,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Features>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
