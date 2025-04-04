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

## Authentication for Protected Endpoints

The app includes a mock authentication system for testing protected endpoints in the SoulGraph API. This system:

1. Generates a mock JWT token that mimics Supabase's authentication token structure
2. Attaches the token to all API requests to the SoulGraph backend
3. Allows testing of APIs protected with the `@login_required` decorator

Key components:
- `src/utils/mockAuth.ts` - Contains utilities to generate mock tokens
- JWT tokens are automatically added to API requests in the route handlers
- The secret key is configurable via the `NEXT_PUBLIC_MOCK_JWT_SECRET` environment variable

## Key Features

- **Connection Status Indicator**: Shows whether the API is available
- **Fixed Test User ID**: No login required for testing
- **Streaming Mode**: Toggle to see responses appear in real-time
- **Simple Interface**: Focus on testing functionality without distractions
- **Mock Authentication**: For testing protected endpoints

## Configuration

The app connects to the SoulGraph API running at http://localhost:8000 by default. This is configured in the `.env.local` file.

## API Integration

The app integrates with these SoulGraph API endpoints:

- `/v0/inference` - For sending and receiving chat messages
- `/v0/health` - For checking API availability
- `/v0/threads` - For managing conversation threads

## Troubleshooting

- **API Connection Issues**: Ensure the Flask backend is running on port 8000
- **Missing Responses**: Check the Flask server logs for errors
- **Streaming Not Working**: Verify streaming is enabled on both frontend and backend
- **Authentication Errors**: Check that the JWT token is being generated correctly and has the required claims

## Technologies

- Next.js
- React
- TypeScript
- Tailwind CSS
- Axios
- JSON Web Tokens (JWT) for authentication testing

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
