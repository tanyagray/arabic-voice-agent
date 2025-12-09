import type { Meta, StoryObj } from '@storybook/react';
import { ConfirmationEmail } from '../src/confirmation';

const meta: Meta<typeof ConfirmationEmail> = {
  title: 'Emails/ConfirmationEmail',
  component: ConfirmationEmail,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    confirmationUrl: {
      control: 'text',
      description: 'The URL for confirming the email address',
    },
    token: {
      control: 'text',
      description: 'The confirmation token code',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    confirmationUrl: 'http://localhost:5173/confirm?token=abc123def456',
    token: 'ABC123',
  },
};

export const WithSupabaseVariables: Story = {
  args: {
    confirmationUrl: '{{ .ConfirmationURL }}',
    token: '{{ .Token }}',
  },
};