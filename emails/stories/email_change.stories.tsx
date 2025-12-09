import type { Meta, StoryObj } from '@storybook/react';
import { EmailChangeEmail } from '../src/email_change';

const meta: Meta<typeof EmailChangeEmail> = {
  title: 'Emails/EmailChangeEmail',
  component: EmailChangeEmail,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    confirmationUrl: {
      control: 'text',
      description: 'The URL for confirming the email change',
    },
    token: {
      control: 'text',
      description: 'The email change confirmation token',
    },
    email: {
      control: 'text',
      description: 'The user\'s current email address',
    },
    newEmail: {
      control: 'text',
      description: 'The user\'s new email address',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    confirmationUrl: 'http://localhost:5173/confirm-email-change?token=change456def',
    token: 'CHG456',
    email: 'old.email@example.com',
    newEmail: 'new.email@example.com',
  },
};

export const WorkToPersonal: Story = {
  args: {
    confirmationUrl: 'http://localhost:5173/confirm-email-change?token=work123personal',
    token: 'W2P123',
    email: 'ahmed.work@company.com',
    newEmail: 'ahmed.personal@gmail.com',
  },
};

export const DomainChange: Story = {
  args: {
    confirmationUrl: 'http://localhost:5173/confirm-email-change?token=domain789switch',
    token: 'DOM789',
    email: 'student@olduniversity.edu',
    newEmail: 'student@newuniversity.edu',
  },
};

export const ProductionExample: Story = {
  args: {
    confirmationUrl: 'http://localhost:5173/auth/callback?type=email_change&token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
    token: 'ECH456',
    email: 'mariam.old@hotmail.com',
    newEmail: 'mariam.new@outlook.com',
  },
};

export const WithSupabaseVariables: Story = {
  args: {
    confirmationUrl: '{{ .ConfirmationURL }}',
    token: '{{ .Token }}',
    email: '{{ .Email }}',
    newEmail: '{{ .NewEmail }}',
  },
};