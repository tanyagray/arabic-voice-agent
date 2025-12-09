import type { Meta, StoryObj } from '@storybook/react';
import { MagicLinkEmail } from '../src/magic_link';

const meta: Meta<typeof MagicLinkEmail> = {
  title: 'Emails/MagicLinkEmail',
  component: MagicLinkEmail,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    confirmationUrl: {
      control: 'text',
      description: 'The magic link URL for passwordless sign-in',
    },
    token: {
      control: 'text',
      description: 'The sign-in token code',
    },
    email: {
      control: 'text',
      description: 'The user\'s email address',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    confirmationUrl: 'http://localhost:5173/auth/callback?token=xyz789abc123',
    token: 'XYZ789',
    email: 'user@example.com',
  },
};

export const ReturningUser: Story = {
  args: {
    confirmationUrl: 'http://localhost:5173/auth/callback?token=returning456def',
    token: 'RET456',
    email: 'returning.student@example.com',
  },
};

export const ProductionExample: Story = {
  args: {
    confirmationUrl: 'http://localhost:5173/auth/callback?type=magiclink&token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
    token: 'MLK789',
    email: 'fatima.arabic@outlook.com',
  },
};

export const WithSupabaseVariables: Story = {
  args: {
    confirmationUrl: '{{ .ConfirmationURL }}',
    token: '{{ .Token }}',
    email: '{{ .Email }}',
  },
};