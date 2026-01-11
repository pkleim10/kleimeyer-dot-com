This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Backgammon AI Feature

The backgammon board editor includes an AI-powered move suggestion system using xAI's Grok model.

### Setup

1. Get an API key from [x.ai](https://x.ai/)
2. Create a `.env.local` file in the project root
3. Add your API key:
   ```
   XAI_API_KEY=your_xai_api_key_here
   ```

### Usage

1. Go to `/other-fun-stuff/backgammon-resources/board-editor`
2. Switch to PLAY mode
3. Roll dice or set a position with dice
4. Click the gear icon to open board settings
5. Select AI difficulty level
6. Click "🤖 Get AI Move" to get strategic analysis
7. Apply the suggested move or continue manually

### How It Works

The system uses a hybrid approach:
- **Local validation**: Ensures all AI suggestions are legal moves
- **AI analysis**: Provides strategic reasoning for the best moves
- **Fallback system**: Uses conservative heuristics if AI is unavailable

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
