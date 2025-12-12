import type { Meta, StoryObj } from '@storybook/react-vite';
import { SessionList } from './SessionList';

const meta = {
  title: 'Components/SessionList',
  component: SessionList,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#1a1a2e' },
      ],
    },
  },
  argTypes: {
    sessions: {
      description: 'Array of session objects to display',
    },
    currentSessionId: {
      description: 'ID of the currently active session',
      control: 'text',
    },
    onSessionSelect: {
      description: 'Callback when a session is selected',
    },
    isLoading: {
      description: 'Whether sessions are being loaded',
      control: 'boolean',
    },
    width: {
      description: 'Width of the component (default: "300px")',
      control: 'text',
    },
    height: {
      description: 'Height of the component (default: "100%")',
      control: 'text',
    },
  },
} satisfies Meta<typeof SessionList>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockSessions = [
  {
    session_id: 'a1b2c3d4-e5f6-4789-a0b1-c2d3e4f5a6b7',
    created_at: new Date().toISOString(),
  },
  {
    session_id: 'b2c3d4e5-f6a7-4890-b1c2-d3e4f5a6b7c8',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
  },
  {
    session_id: 'c3d4e5f6-a7b8-4901-c2d3-e4f5a6b7c8d9',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
  },
  {
    session_id: 'd4e5f6a7-b8c9-4012-d3e4-f5a6b7c8d9e0',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
  },
  {
    session_id: 'e5f6a7b8-c9d0-4123-e4f5-a6b7c8d9e0f1',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
  },
];

export const Default: Story = {
  args: {
    sessions: mockSessions,
    currentSessionId: mockSessions[0].session_id,
    onSessionSelect: (sessionId: string) => {
      console.log('Selected session:', sessionId);
    },
    isLoading: false,
  },
};
