# StatMind question bank

The question bank combines manual filtering and AI-assisted paper planning in one workspace. Teachers can upload course material, confirm the extracted knowledge points, set question count/type/difficulty constraints, and then apply a deterministic selection of reviewed questions to the same paper basket used by manual filtering.

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

Open [http://localhost:3200/st-qselector](http://localhost:3200/st-qselector) with your browser to see the result.

## Optional AI knowledge extraction

Copy `.env.example` to `.env.local` and set `OPENAI_API_KEY`. The key is read only in the server route and must not use a `NEXT_PUBLIC_` prefix. `OPENAI_BASE_URL` and `OPENAI_MODEL` can be changed for an OpenAI-compatible service.

If no key is configured, uploaded material is still analyzed with the built-in statistics taxonomy. AI extraction only proposes knowledge points; the teacher must confirm them, and only reviewed, complete questions with answers can enter the generated paper.

Supported courseware formats: PDF, PPTX, DOCX, TXT, Markdown. Files are limited to 15 MB.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
