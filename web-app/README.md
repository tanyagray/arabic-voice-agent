# Arabic Voice Agent - Marketing Website

A modern, single-page marketing website for the Arabic Voice Agent with voice conversation capabilities.

## Features

- **Hero Section** with voice demo for instant conversations
- **Real-time Voice** interaction with AI Arabic tutor
- **Modern Design** with Arabic-inspired gradient colors and smooth animations
- **Responsive** layout optimized for all devices
- **Feature Showcase** highlighting key capabilities
- **WebSocket-based** voice processing

## Tech Stack

- **Vite** - Fast build tool and dev server
- **React 18** - UI framework
- **TypeScript** - Type safety
- **TailwindCSS** - Utility-first styling
- **Framer Motion** - Smooth animations

## Prerequisites

- Node.js 18+
- Running instance of the `web-api` server (for voice and chat functionality)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file and configure your API URL:

```bash
cp .env.example .env
```

Edit `.env` and set your API URL:

```env
VITE_API_URL=http://localhost:8000
```

### 3. Start Development Server

```bash
npm run dev
```

The website will be available at `http://localhost:5173`

### 4. Start Required Services

For the voice functionality to work, you need:

1. **Web API Server**:
   ```bash
   cd ../web-api
   # Follow the web-api README to start the server
   ```

## Project Structure

```
web-app/
├── src/
│   ├── components/
│   │   ├── Hero.tsx          # Hero section with voice demo
│   │   ├── VoiceAgent.tsx    # LiveKit voice integration
│   │   ├── Features.tsx      # Features showcase
│   │   └── Footer.tsx        # Footer component
│   ├── App.tsx               # Main app component
│   ├── main.tsx              # Entry point
│   └── index.css             # Global styles
├── index.html                # HTML template
├── tailwind.config.js        # Tailwind configuration
├── vite.config.ts            # Vite configuration
└── package.json              # Dependencies
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint

## Deployment

### Build for Production

```bash
npm run build
```

The optimized production build will be in the `dist/` directory.

### Environment Variables for Production

Make sure to set `VITE_API_URL` to your production API URL:

```env
VITE_API_URL=https://your-api-domain.com
```

### Deploy Options

The built static site can be deployed to:
- Vercel
- Netlify
- AWS S3 + CloudFront
- GitHub Pages
- Any static hosting service

Example deployment to Vercel:

```bash
npm install -g vercel
vercel --prod
```

## Customization

### Colors

The color scheme uses TailwindCSS custom colors defined in [tailwind.config.js](tailwind.config.js):

- `primary` - Teal shades (main brand color)
- `accent` - Gold/amber shades (highlights)

### Components

Each component is self-contained and can be customized independently:

- **Hero** - Main landing section with voice demo
- **VoiceAgent** - LiveKit voice interaction widget
- **Features** - Feature cards and stats
- **Footer** - Footer with links and info

## Troubleshooting

### Voice Not Working

1. Ensure `web-api` server is running on the configured `VITE_API_URL`
2. Verify your browser has microphone permissions enabled
3. Check browser console for error messages
4. Verify API keys are configured in the web-api

### CORS Errors

If you see CORS errors, make sure the `web-api` server has CORS enabled for your domain. In development, it should allow `http://localhost:5173`.

### Build Errors

If you encounter build errors:

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite
```

## License

MIT
