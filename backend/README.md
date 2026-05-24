# AdNode Backend

Express API, marketplace services, MongoDB persistence, measurement intake, assistant routes, and settlement workers.

Local:

```bash
cd backend
npm run dev
```

The backend reads the root `.env` through `dotenv/config`. Local split testing uses:

```env
PORT=4000
ADNODE_CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

Render can use this folder for the API service and run:

```bash
npm run dev
```

Use a separate Render worker from this same folder for settlement:

```bash
npm run worker:settlement
```
