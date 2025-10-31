# MindForge - Men's Mental Health Journal

A mental health journaling application built with React, Vite, and the Base44 platform.

## Features

- **Onboarding Flow**: Personalized setup based on life situation and goals
- **Journal Entries**: Multiple journaling modes (Guided, Voice, Free-form)
- **Mood Check-ins**: Track your emotional state over time
- **Goals Management**: Set and track personal goals
- **AI Mentor**: Get personalized insights and guidance
- **Analytics & Insights**: Visualize your mental health journey
- **Community**: Connect with others (privacy-focused)
- **Resources**: Access mental health resources and tools

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Base44 account and application ID

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Base44**:
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Get your Base44 credentials from https://base44.com
   - Update `.env` with your values:
     ```
     VITE_BASE44_APP_ID=your-actual-app-id
     VITE_BASE44_BACKEND_URL=https://api.base44.com
     ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser**:
   - Navigate to http://localhost:5173

## Important Note

This application requires Base44 authentication and backend services to function. Without proper Base44 configuration, the app will display a blank page or loading spinner.

To use this app, you need to:
1. Create a Base44 account at https://base44.com
2. Set up a new application in your Base44 dashboard
3. Configure the environment variables with your app credentials

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Tech Stack

- React 18
- Vite 6
- TailwindCSS
- Radix UI / shadcn/ui components
- React Query
- React Router
- Base44 SDK
- Framer Motion
