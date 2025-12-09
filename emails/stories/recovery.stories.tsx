import type { Meta, StoryObj } from '@storybook/react';
import { RecoveryEmail } from '../src/recovery';

const meta: Meta<typeof RecoveryEmail> = {
  title: 'Emails/RecoveryEmail',
  component: RecoveryEmail,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    confirmationUrl: {
      control: 'text',
      description: 'The URL for resetting the password',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    confirmationUrl: 'http://localhost:5173/reset-password?token=def456abc789',
  },
};

export const UrgentReset: Story = {
  args: {
    confirmationUrl: 'http://localhost:5173/reset-password?token=urgent789ghi012',
  },
};

export const ProductionExample: Story = {
  args: {
    confirmationUrl: 'http://localhost:5173/auth/callback?type=recovery&token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
  },
};

export const WithSupabaseVariables: Story = {
  args: {
    confirmationUrl: '{{ .ConfirmationURL }}',
  },
};