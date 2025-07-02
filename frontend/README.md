# Frontend

A basic frontend for the our tiny campaigns app.

## Setup & Installation

```bash
cd frontend
npm install
npm run dev
```

- App runs at: http://localhost:3000
- Expects backend API at: http://localhost:3001

## Scripts

- `npm run dev` — Start development server
- `npm run build` — Build for production
- `npm run start` — Start production server
- `npm run lint` — Lint code

## Project Structure

```
frontend/
├── app/                # App Router pages
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Home/dashboard
│   ├── candidates/     # Candidates CRUD
│   ├── volunteers/     # Volunteers CRUD
│   ├── events/         # Events CRUD
│   └── attendances/    # Attendances CRUD
├── components/         # Shared React components
├── lib/                # API utilities
├── public/             # Static assets
├── styles/             # Global styles
├── tsconfig.json       # TypeScript config
├── next.config.js      # Next.js config
└── package.json        # Dependencies & scripts
```
