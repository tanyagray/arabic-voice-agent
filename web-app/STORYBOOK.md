# Storybook Documentation

This document describes the Storybook setup for the Arabic Voice Agent web application.

## Overview

Storybook has been configured to provide an interactive development environment for all React components. Each component has a default story that demonstrates its basic usage, organized into three categories: Pages, Components, and Atoms.

## Getting Started

### Running Storybook

```bash
npm run storybook
```

This will start the Storybook development server at [http://localhost:6006](http://localhost:6006)

### Building Storybook

```bash
npm run build-storybook
```

This generates a static Storybook build in the `storybook-static` directory.

## Story Organization

Stories are organized into three categories based on component complexity and purpose:

### Pages

Full-page sections and layout components:

- **Hero** ([Hero.stories.tsx](src/components/Hero.stories.tsx)) - Main hero section with animated gradient background and demo widget
- **Features** ([Features.stories.tsx](src/components/Features.stories.tsx)) - Features grid showcase section with stats
- **Footer** ([Footer.stories.tsx](src/components/Footer.stories.tsx)) - Application footer with branding and links

### Components

Complex, composed components that combine multiple atoms:

- **ActiveSession** ([ActiveSession.stories.tsx](src/components/ActiveSession/ActiveSession.stories.tsx)) - Main voice agent widget with LiveKit integration
- **Transcript** ([Transcript.stories.tsx](src/components/Transcript.stories.tsx)) - Conversation transcript display with message bubbles

### Atoms

Small, reusable UI elements and controls:

- **StatusIndicator** ([StatusIndicator.stories.tsx](src/components/StatusIndicator.stories.tsx)) - Agent status display with animated states (listening, thinking, speaking)
- **AudioInput** ([AudioInput.stories.tsx](src/components/AudioInput.stories.tsx)) - Audio input control with microphone toggle
- **TextInput** ([TextInput.stories.tsx](src/components/TextInput.stories.tsx)) - Text message input form with send button

## Configuration

### Storybook Config Files

- **[.storybook/main.ts](.storybook/main.ts)** - Main Storybook configuration
  - Stories glob patterns
  - Addons configuration
  - Framework settings (React + Vite)

- **[.storybook/preview.ts](.storybook/preview.ts)** - Preview configuration
  - Imports global styles (Tailwind CSS)
  - Sets up control matchers
  - Configures parameters

### Addons Enabled

- `@chromatic-com/storybook` - Chromatic integration for visual testing
- `@storybook/addon-docs` - Auto-generated documentation
- `@storybook/addon-onboarding` - Interactive onboarding for new users
- `@storybook/addon-a11y` - Accessibility testing

## Component Stories Structure

Each story follows this structure:

```typescript
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ComponentName } from './ComponentName';

const meta = {
  title: 'Pages/ComponentName', // or 'Components/' or 'Atoms/'
  component: ComponentName,
  parameters: {
    layout: 'centered', // or 'fullscreen', 'padded'
  },
} satisfies Meta<typeof ComponentName>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    // Component props here
  },
};
```

Note: Autodocs has been disabled for all stories to keep the interface clean and focused on visual component examples.

## Known Limitations

Some components depend on LiveKit hooks that require a live connection. These stories will show the component in a loading or disconnected state. To test these components fully:

1. Start the web-api backend server
2. Use the actual application at http://localhost:5173
3. Or create mock providers in Storybook decorators (advanced)

## Adding New Stories

To add a story for a new component:

1. Create a file named `ComponentName.stories.tsx` next to your component
2. Import the component and required types
3. Define the meta object with component metadata
4. Export a Default story with example props
5. Storybook will automatically detect and load your story

## Tips

- Use **Controls** addon to interact with component props in real-time
- Use **Accessibility** addon to check for a11y issues
- Stories are hot-reloaded during development
- All Tailwind CSS styles are available in stories
- Use dark backgrounds for components designed for dark mode

## Resources

- [Storybook Documentation](https://storybook.js.org/docs)
- [Writing Stories Guide](https://storybook.js.org/docs/writing-stories)
- [Storybook for React](https://storybook.js.org/docs/react)
