import type { Preview } from '@storybook/react-vite'
import '../src/index.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
       color: /(background|color)$/i,
       date: /Date$/i,
      },
    },
    options: {
      storySort: {
        order: ['Pages', 'Components', 'Atoms'],
      },
    },
    backgrounds: {
      default: 'dark',
    },
  },
};

export default preview;