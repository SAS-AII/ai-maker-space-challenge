# AI Chat Frontend

A modern, responsive chat interface built with Next.js 14+ and TypeScript for interacting with AI models through a FastAPI backend.

## Features

- **Collapsible Sidebar**: Manage multiple chat sessions with titles and dates
- **Real-time Streaming**: See AI responses as they're being generated
- **Image Support**: Upload and view images in conversations with lightbox
- **Settings Management**: Configure developer prompts, system prompts, and model selection
- **Mobile-First Design**: Responsive layout that works on all devices
- **Accessibility**: WCAG-compliant with proper ARIA labels and keyboard navigation
- **Local Storage**: Persists chat sessions and settings locally

## Prerequisites

- Node.js 18+ 
- npm or yarn
- FastAPI backend running on `http://localhost:8000`

## Installation

1. **Install dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Set up environment variables** (optional):
   Create a `.env.local` file in the frontend directory:
   ```bash
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Project Structure

```
frontend/
├── app/                    # Next.js app router
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── chat/             # Chat-specific components
│   │   ├── ChatContainer.tsx
│   │   ├── ChatInput.tsx
│   │   ├── ChatMessage.tsx
│   │   ├── ChatSidebar.tsx
│   │   └── SettingsModal.tsx
│   └── ui/               # Reusable UI components
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Select.tsx
│       └── Textarea.tsx
├── lib/                  # Utility functions
│   ├── api.ts           # API communication
│   └── utils.ts         # Helper functions
├── types/               # TypeScript type definitions
│   └── chat.ts
└── public/              # Static assets
```

## Deployment

### Vercel (Recommended)

1. **Push your code** to a Git repository (GitHub, GitLab, etc.)

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Import your repository
   - Vercel will automatically detect Next.js and configure the build

3. **Set environment variables** in Vercel dashboard:
   - `NEXT_PUBLIC_API_URL` - Your production API URL

4. **Deploy**: Vercel will automatically deploy on every push to main branch

### Manual Deployment

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Start the production server**:
   ```bash
   npm run start
   ```

### Environment Configuration

For production deployment, update the `vercel.json` file with your actual backend URL:

```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://your-backend-url.com/api/:path*"
    }
  ]
}
```

## API Integration

The frontend communicates with your FastAPI backend at `/api/chat` endpoint. Make sure your backend:

1. **Accepts POST requests** to `/api/chat`
2. **Returns streaming responses** with `text/plain` content type
3. **Handles CORS** for cross-origin requests
4. **Provides health check** at `/api/health`

### Expected Request Format

```typescript
{
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
}
```

## Customization

### Styling

The application uses Tailwind CSS. You can customize:

- **Colors**: Edit `tailwind.config.js` theme colors
- **Components**: Modify component styles in `app/globals.css`
- **Layout**: Adjust responsive breakpoints and spacing

### Adding New Models

To add new AI models:

1. Update `AVAILABLE_MODELS` in `types/chat.ts`
2. The settings modal will automatically include new models

### Extending Features

- **File Upload**: Extend `ChatInput` component for document uploads
- **Voice Messages**: Add audio recording capabilities
- **Export Chats**: Implement chat export functionality
- **User Authentication**: Add login/signup flows

## Troubleshooting

### Common Issues

1. **API Connection Error**:
   - Ensure your FastAPI backend is running on `http://localhost:8000`
   - Check CORS configuration in your backend
   - Verify the `/api/chat` endpoint exists

2. **Build Errors**:
   - Clear `.next` folder: `rm -rf .next`
   - Reinstall dependencies: `rm -rf node_modules && npm install`

3. **TypeScript Errors**:
   - Run `npm run lint` to identify issues
   - Check type definitions in `types/chat.ts`

### Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.