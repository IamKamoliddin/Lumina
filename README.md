# React + Vite

## StudyGPT Gemini setup

The StudyGPT assistant calls Gemini only through the backend endpoint `POST /api/ai/chat`.
Do not put Gemini keys in React, Vite, or any `VITE_` environment variable.

1. Generate a new Gemini API key. If an old key was pasted into chat, screenshots, frontend code, or a public place, revoke it and treat it as compromised.
2. Add the new key to `backend/.env`:

```env
GEMINI_API_KEY=your_new_key_here
GEMINI_MODEL=gemini-2.5-flash
```

3. Restart the backend after changing `backend/.env`.
4. Run the app:

```sh
npm run dev:backend
npm --workspace frontend run dev -- --host 0.0.0.0
```

5. Confirm the backend is healthy:

```sh
curl http://localhost:4000/health
```

The AI route requires an authenticated StudyGPT session. The frontend sends only study-related context such as active books, events, tasks, selected subject, and focus totals.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
