# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Start dev server (ng serve)
npm run build      # Production build
npm run watch      # Watch mode build (development)
npm test           # Run tests with Vitest
```

## Architecture

**KonKat** is a frontend-only Angular 21 social/community platform. There is no backend — all data is mocked in services with static/hardcoded values.

### Entry Points

- `src/main.ts` → bootstraps `App` component with `appConfig`
- `src/app/app.routes.ts` → route definitions
- `src/app/app.config.ts` → DI config, router providers, Highlight.js setup

Routes: `/feed`, `/projects`, `/hackathons`, `/find-team`, `/chat`, `/qa`, `/profile`, `/workspace`, `/myworkspaces`, `/notifications`

### Directory Layout

```
src/app/
├── components/      # Reusable UI components (event-card, hero-banner, team-card)
├── features/        # Page-level feature modules — each has *.ts + *.html + *.css + .model.ts + .service.ts
│   ├── home-feed/
│   ├── projects/
│   ├── hackathons/
│   ├── find-team/
│   ├── messages/
│   ├── profile/
│   ├── workspace/
│   └── qa/
├── layout/          # App-wide layout (navbar, sidebar, right-panel)
└── shared/          # Cross-feature components and services (post-card, notification-bell, etc.)
```

### State Management

All services use `providedIn: 'root'` singleton pattern with **Angular Signals** (not Observables) for reactive state.

```typescript
// Service pattern
private profile = signal<UserProfile>({...});
getProfile() { return this.profile(); }

// Component pattern
posts = signal<Post[]>([]);
ngOnInit() { this.posts.set(this.postService.getPosts()); }
```

Services expose data via getter methods that return signal values (`.update()` / `.set()` for mutations).

### Tech Stack

- **Framework**: Angular 21 with standalone components (`imports: [...]` on each component)
- **Styling**: Tailwind CSS 3.4 + Angular Material 21
- **Language**: TypeScript 5.9 (strict mode, ES2022 target)
- **Testing**: Vitest + jsdom
- **Code highlighting**: highlight.js + ngx-highlightjs (GitHub Dark theme)
- **Animations**: AOS (Animate On Scroll)

### Tailwind Theme

Brand colors defined in `tailwind.config.js`:
- `primary`: `#E8593C` (orange/coral)
- `surface`: `#1a1a1a` (dark background)
- `border`: `#2a2a2a` (dark border)

### Conventions

- Standalone components only — no NgModules
- Signals preferred over Observables
- Each feature directory owns its own model types (`*.model.ts`) and service (`*.service.ts`)
- Component files: `ComponentName.ts` / `ComponentName.html` / `ComponentName.css` (PascalCase)
- Prettier enforced: 100-char line width, single quotes, Angular HTML parser