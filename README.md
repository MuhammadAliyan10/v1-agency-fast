# Classy Crave Ordering System

Welcome to the Classy Crave front-end repository. This project is built using modern React paradigms, designed for ultra-high performance, robust type safety, and luxury-tier user experiences.

## Tech Stack
- **Framework:** [Next.js 16 (App Router)](https://nextjs.org/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **Component Library:** [shadcn/ui](https://ui.shadcn.com/) (Radix Primitives)
- **State Management:** [Zustand](https://github.com/pmndrs/zustand)
- **Form Handling:** [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Animations:** [Framer Motion](https://www.framer.com/motion/)

## Folder Architecture

The project enforces a strict separation of concerns for maintainability and scalability:

```text
/
├── app/                  # Next.js App Router (pages, layouts, global providers)
│   ├── api/              # Route handlers (BFF - Backend for Frontend)
│   └── (routes)/         # Feature-specific page routes
├── components/           # React Components
│   ├── ui/               # Base shadcn/ui and atomic components (buttons, inputs)
│   ├── layout/           # Structural components (Navbar, Sidebar, Footer)
│   ├── shared/           # Reusable generic components (Cards, Modals)
│   └── features/         # Domain-specific components (Cart, ProductList)
├── hooks/                # Custom React hooks (e.g., useCart, useMediaQuery)
├── services/             # External integrations (API calls, third-party SDKs)
├── store/                # Global state slices (Zustand)
├── types/                # Global TypeScript declarations and interfaces
├── config/               # Environment variables, SEO config, site metadata
├── constants/            # Static data, magic strings, and configuration objects
└── lib/                  # Utility functions (utils.ts, formatting, helpers)
```

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Development Guidelines

- **Components:** Place all domain-specific logic in `components/features`. Keep `app/` files strictly for routing and data fetching (Server Components).
- **Forms:** Always use `react-hook-form` coupled with `zod` schema validation for data entry.
- **State:** Prefer local state for UI concerns. Use `Zustand` for cross-cutting global state (e.g., Shopping Cart, User Session).
- **Styling:** Utilize the `cn()` utility (`lib/utils.ts`) for conditionally merging Tailwind classes safely.

## Scripts
- `npm run dev` - Starts the local development server.
- `npm run build` - Creates an optimized production build.
- `npm run start` - Starts the production server.
- `npm run lint` - Runs ESLint to verify code quality.
