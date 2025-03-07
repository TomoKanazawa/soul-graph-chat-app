# SoulGraph Chat App - Internal Testing Tool

This is a simple chat application for internal testing of the SoulGraph backend. It provides a straightforward interface to interact with and test the SoulGraph API during development.

## Purpose

- Internal testing tool for SoulGraph development
- Allows quick verification of API functionality
- Provides a simple UI for testing conversation flows
- Helps debug streaming responses and API behavior

## Prerequisites

- Node.js 18+ and npm
- SoulGraph Flask backend

## Quick Start Guide

### 1. Start the SoulGraph Flask Backend

```bash
# Navigate to the SoulGraph backend directory
cd ../soulgraph_production  # or your backend directory

# Run the Flask server with debug mode enabled
flask run --debug
```

**Note:** The backend is configured to run on port 8000 by default (set via environment variable).

### 2. Set Up and Run the Chat App

```bash
# Navigate to the chat-app directory (if not already there)
cd chat-app

# Install dependencies (only needed first time or when dependencies change)
npm install

# Run the development server
npm run dev
```

### 3. Access the Chat Interface

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Key Features

- **Connection Status Indicator**: Shows whether the API is available
- **Fixed Test User ID**: No login required for testing
- **Streaming Mode**: Toggle to see responses appear in real-time
- **Simple Interface**: Focus on testing functionality without distractions

## Configuration

The app connects to the SoulGraph API running at http://localhost:8000 by default. This is configured in the `.env.local` file.

## API Integration

The app integrates with these SoulGraph API endpoints:

- `/v0/inference` - For sending and receiving chat messages
- `/v0/health` - For checking API availability

## Troubleshooting

- **API Connection Issues**: Ensure the Flask backend is running on port 8000
- **Missing Responses**: Check the Flask server logs for errors
- **Streaming Not Working**: Verify streaming is enabled on both frontend and backend

## Technologies

- Next.js
- React
- TypeScript
- Tailwind CSS
- Axios

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
