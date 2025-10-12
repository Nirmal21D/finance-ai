# AI-Powered Personal Finance Manager

A Neo-Brutalist styled personal finance web app built with Next.js, Firebase, and Google Gemini AI.

## Features

- 🏠 **Dashboard** - Income, expenses, savings overview with AI insights
- 💸 **Transaction Management** - Add, edit, delete transactions with AI categorization
- 🧠 **AI Assistant** - Chat with Gemini for financial advice and insights
- 📊 **Smart Reports** - AI-generated monthly summaries with PDF export
- 🌐 **Market Data** - Live crypto/stock prices with investment suggestions
- 🔔 **Smart Alerts** - Budget notifications via Firebase Cloud Messaging
- 🎨 **Neo-Brutalism Design** - Bold, functional UI with strong borders and flat colors

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS, Neo-Brutalism design system
- **Backend**: Firebase (Auth + Firestore)
- **AI**: Google Gemini API
- **Charts**: Recharts
- **PDF**: jsPDF
- **Hosting**: Vercel

## Quick Start

### 1. Install Dependencies

```bash
npm install --legacy-peer-deps
```

### 2. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env.local
```

Fill in your Firebase configuration in `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

Add your AI provider key (check your deployment platform):
```env
# For Vercel AI SDK
VERCEL_AI_KEY=your_ai_key_here
# OR for OpenAI
OPENAI_API_KEY=your_openai_key_here
# OR other provider key as needed
```

### 3. Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication (anonymous auth + optional email/password)
3. Enable Firestore Database
4. Set up Firestore security rules (see `firestore.rules` example)
5. (Optional) Enable Cloud Messaging for notifications

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Build for Production

```bash
npm run build
npm start
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API key | Yes |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | Yes |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | Yes |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | Yes |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | Yes |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID | Yes |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Firebase analytics measurement ID | Optional |
| `VERCEL_AI_KEY` or `OPENAI_API_KEY` | AI provider API key | Yes |

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy

### Manual Deployment

1. Run `npm run build`
2. Deploy `out/` directory to your hosting provider
3. Set environment variables on your hosting platform

## Firebase Firestore Collections

- `transactions` - User financial transactions
- `users` - User profiles and preferences
- `goals` - Savings goals and targets
- `notifications` - Alert preferences

## API Routes

- `POST /api/ai/chat` - Chat with AI assistant
- `POST /api/ai/categorize` - Auto-categorize transactions
- `GET /api/market` - Get live market data

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes following the Neo-Brutalism design system
4. Add tests for new features
5. Submit a pull request

## Design System

The app follows Neo-Brutalism design principles:
- Thick solid borders (2-4px)
- Flat surfaces with bold colors
- Hard-edged shadows
- Sans-serif typography (Space Grotesk, Inter)
- High contrast and accessibility

## License

MIT License - see LICENSE file for details