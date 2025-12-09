import type { Meta, StoryObj } from '@storybook/react';
import { InviteEmail } from '../src/invite';

const meta: Meta<typeof InviteEmail> = {
  title: 'Emails/InviteEmail',
  component: InviteEmail,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    confirmationUrl: {
      control: 'text',
      description: 'The URL for accepting the invitation',
    },
    email: {
      control: 'text',
      description: 'The invited user\'s email address',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    confirmationUrl: 'http://localhost:5173/invite?token=invite123abc',
    email: 'newuser@example.com',
  },
};

export const TeacherInvite: Story = {
  args: {
    confirmationUrl: 'http://localhost:5173/invite?token=teacher456def&role=educator',
    email: 'teacher@arabicschool.edu',
  },
};

export const FriendInvite: Story = {
  args: {
    confirmationUrl: 'http://localhost:5173/invite?token=friend789ghi&ref=social',
    email: 'friend.of.learner@gmail.com',
  },
};

export const ProductionExample: Story = {
  args: {
    confirmationUrl: 'http://localhost:5173/auth/callback?type=invite&token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
    email: 'new.student@university.edu',
  },
};

export const WithSupabaseVariables: Story = {
  args: {
    confirmationUrl: '{{ .ConfirmationURL }}',
    email: '{{ .Email }}',
  },
};