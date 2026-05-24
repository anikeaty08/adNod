# AdNode Frontend

Next.js app for advertisers, publishers, admins, embeds, docs, and the assistant.

Local:

```bash
cd frontend
npm run dev
```

The frontend reads the root `.env`. For split local testing it should point at the backend with:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:4000
```
