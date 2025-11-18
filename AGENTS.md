# Repository Guidelines

## Project Structure & Module Organization

`/app` holds Next.js routes and server actions; colocate UI logic with route segments and keep shared layouts in `app/(site)/layout.tsx`. Store reusable UI primitives in `/components`, and domain helpers (auth, data fetching, feature flags) inside `/lib`. Database schema, migrations, and Drizzle snapshots stay in `/drizzle`; run migrations before shipping schema changes. Static assets and screenshots belong in `/images`.

## Build, Test, and Development Commands

- `npm run dev` — start the Next.js dev server with hot reload; ensure `.env.local` is ready first.
- `npm run build` — create an optimized production bundle and run type checks.
- `npm run start` — serve the production build locally for smoke tests.
- `npm run drizzle:generate` / `npm run drizzle:migrate` — generate and apply schema migrations; rerun whenever models in `/drizzle` or `/lib/db` change.
- `npm run lint` and `npm run format` — enforce ESLint + Prettier rules before pushing.

## Coding Style & Naming Conventions

1. Use `npm run format` to format code.
2. Use `npm run lint` to check for linting errors.

## UI/UX Design

<use_interesting_fonts>
Typography instantly signals quality. Avoid using boring, generic fonts.

Never use: Inter, Roboto, Open Sans, Lato, default system fonts

Here are some examples of good, impactful choices:

- Code aesthetic: JetBrains Mono, Fira Code, Space Grotesk
- Editorial: Playfair Display, Crimson Pro
- Technical: IBM Plex family, Source Sans 3
- Distinctive: Bricolage Grotesque, Newsreader

Pairing principle: High contrast = interesting. Display + monospace, serif + geometric sans, variable font across weights.

Use extremes: 100/200 weight vs 800/900, not 400 vs 600. Size jumps of 3x+, not 1.5x.

Pick one distinctive font, use it decisively. Load from Google Fonts.
</use_interesting_fonts>

<frontend_aesthetics>
You tend to converge toward generic, "on distribution" outputs. In frontend design,this creates what users call the "AI slop" aesthetic. Avoid this: make creative,distinctive frontends that surprise and delight.

Focus on:

- Typography: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics.
- Color & Theme: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes. Draw from IDE themes and cultural aesthetics for inspiration.
- Motion: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions.
- Backgrounds: Create atmosphere and depth rather than defaulting to solid colors. Layer CSS gradients, use geometric patterns, or add contextual effects that match the overall aesthetic.

Avoid generic AI-generated aesthetics:

- Overused font families (Inter, Roboto, Arial, system fonts)
- Clichéd color schemes (particularly purple gradients on white backgrounds)
- Predictable layouts and component patterns
- Cookie-cutter design that lacks context-specific character

Interpret creatively and make unexpected choices that feel genuinely designed for the context. Vary between light and dark themes, different fonts, different aesthetics. You still tend to converge on common choices (Space Grotesk, for example) across generations. Avoid this: it is critical that you think outside the box!
</frontend_aesthetics>

## Testing Guidelines

Component and hook tests should use Vitest plus Testing Library; import `@testing-library/jest-dom` for matchers. Snapshot only leaf components. Name spec files `*.test.ts(x)` and colocate next to the unit under test. Execute suites with `npx vitest run --coverage` until a script alias is added. Cover auth flows, database utilities, and UI states touched by the PR.

## Commit & Pull Request Guidelines

Commits follow the repo’s initial imperative-mood style (`first commit`); keep them scoped and reference domain areas, e.g., `Add todo filters` or `Fix drizzle migration`. Each PR must include a change summary, screenshots for UI work (`/images` is a handy drop zone), manual test notes, and links to related issues. Confirm migrations were generated/applied and mention any new env vars in the PR description.

## Environment & Configuration

Copy the Neon Auth secrets (`NEXT_PUBLIC_STACK_PROJECT_ID`, etc.) into `.env.local`; never commit this file. For new contributors, document extra secrets inside `README.md` and reference Neon Console instructions. Rotate keys if they appear in logs or PR discussions.

## Learning and Memory

After every session, write down your key learnings in LEARNINGS.md. Before starting every session, make sure to read LEARNINGS.md and don't repeat the same mistakes.
