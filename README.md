# SoulGraph Chat App

This is a Next.js chat application that connects to the SoulGraph Flask backend for testing purposes.

## Features

- Simple chat interface
- Connection status indicator
- Fixed test user ID (no login required)
- Responsive design
- Streaming mode for real-time responses

## Prerequisites

- Node.js 18+ and npm
- SoulGraph Flask backend running at http://localhost:8000

## Getting Started

1. Make sure the SoulGraph Flask backend is running:

```bash
cd ../soulgraph_production
flask run --debug
```

2. Install dependencies:

```bash
npm install
```

3. Run the development server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## How It Works

- The chat app connects to the SoulGraph Flask API running at http://localhost:8000
- All messages are sent with a fixed test user ID
- The app creates a new thread for the first message and then continues the conversation in that thread
- The connection status indicator shows whether the API is available
- Streaming mode allows responses to appear gradually as they're generated
- You can toggle streaming mode on/off with the checkbox below the input field

## API Integration

The app integrates with the following SoulGraph API endpoints:

- `/v0/inference` - For sending and receiving chat messages
- `/v0/health` - For checking API availability

## Technologies Used

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
