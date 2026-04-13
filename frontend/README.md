# CoverAI Frontend

> Premium dark-themed Next.js 14 frontend for the CoverAI insurance platform.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 (custom design system) |
| Animations | Framer Motion 11 |
| State | Zustand 4 (auth + compare store) |
| Data Fetching | TanStack React Query 5 |
| Forms | React Hook Form + Zod |
| UI Primitives | Radix UI |
| Charts | Recharts |
| Fonts | DM Sans + DM Mono + Clash Display |
| Payment | Razorpay.js |
| Toasts | React Hot Toast |
| HTTP Client | Axios (with JWT refresh interceptor) |

---

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.local.example .env.local
# Edit NEXT_PUBLIC_API_URL to point to your backend

# Start development server
npm run dev
```

App runs at **http://localhost:3000**

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx          — Split-panel auth layout
│   │   ├── login/page.tsx      — Login with Google OAuth
│   │   └── signup/page.tsx     — Register with validation
│   ├── (dashboard)/
│   │   ├── layout.tsx          — Protected layout + sidebar
│   │   ├── dashboard/page.tsx  — Overview with stats
│   │   ├── policies/page.tsx   — My policies (expandable rows)
│   │   └── quotes/page.tsx     — My quotes with expiry tracking
│   ├── policies/page.tsx       — Browse + filter all policies
│   ├── compare/page.tsx        — Side-by-side comparison matrix
│   ├── recommend/page.tsx      — AI recommendations + insights
│   ├── checkout/page.tsx       — Razorpay payment flow
│   ├── profile/page.tsx        — Profile editor + health flags
│   ├── not-found.tsx
│   ├── layout.tsx              — Root layout (fonts, metadata)
│   ├── page.tsx                — Landing page
│   └── providers.tsx           — QueryClient + Toaster
│
├── components/
│   ├── ui/
│   │   ├── Button.tsx          — 6 variants, loading state, Framer Motion
│   │   ├── Card.tsx            — Card, Badge, Skeleton, StatCard, Divider
│   │   ├── Input.tsx           — Input, Textarea, Select
│   │   └── Modal.tsx           — Animated modal with backdrop
│   ├── layout/
│   │   ├── Navbar.tsx          — Sticky glass navbar + mobile menu
│   │   ├── Sidebar.tsx         — Dashboard sidebar (desktop only)
│   │   └── Footer.tsx          — 4-column footer
│   ├── policy/
│   │   ├── PolicyCard.tsx      — Full card with compare + quote
│   │   ├── FilterPanel.tsx     — Desktop + mobile filter drawer
│   │   └── CompareBar.tsx      — Floating compare bar (up to 4 policies)
│   ├── recommendations/
│   │   └── RecommendationCard.tsx — AI score bar + reasons
│   └── dashboard/
│       └── Charts.tsx          — Recharts Area + Pie (dark theme)
│
├── hooks/
│   ├── useAuth.ts     — useLogin, useRegister, useLogout, useMe…
│   ├── usePolicies.ts — usePolicies, usePolicy, useComparePolicies…
│   └── useUser.ts     — useDashboard, useMyPolicies, useCreateOrder…
│
├── lib/
│   ├── api.ts         — Axios instance + JWT refresh interceptor
│   └── utils.ts       — cn(), formatCurrency(), getCategoryColor()…
│
├── store/
│   ├── authStore.ts   — Zustand auth (persisted)
│   └── compareStore.ts — Selected policies for comparison
│
├── types/
│   └── index.ts       — All TypeScript interfaces
│
└── styles/
    └── globals.css    — CSS variables, glassmorphism, animations
```

---

## Design System

### Color Tokens (CSS Variables)
```css
--bg-base:      #020617   /* deepest background */
--bg-surface:   #0f172a   /* cards, panels */
--bg-elevated:  #1e293b   /* modals, inputs */
--tx-primary:   #f8fafc   /* primary text */
--tx-secondary: #94a3b8   /* secondary text */
--tx-muted:     #475569   /* muted text */
--brand-purple: #7c3aed
--brand-blue:   #2563eb
--neon-green:   #34d399
--neon-amber:   #fbbf24
--neon-blue:    #38bdf8
```

### Typography
- **Display**: Clash Display (headings, brand)
- **Body**: DM Sans (all text)
- **Mono**: DM Mono (code, policy numbers)

### Key Utilities
```
.text-gradient     — Purple→blue gradient text
.glass             — Glassmorphism (blur + semi-transparent)
.glass-strong      — Stronger glassmorphism
.bg-mesh           — Radial gradient mesh background
.shimmer           — Loading skeleton animation
.card-base         — Base card styles
.scrollbar-hide    — Hidden scrollbar
```

---

## Authentication Flow

```
1. User signs up/in → tokens stored in cookies (httpOnly via Axios interceptor)
2. Zustand persists user object in localStorage
3. All API calls auto-attach Bearer token via request interceptor
4. On 401 → auto-refresh → retry original request
5. Failed refresh → clear tokens + redirect to /login
```

## Payment Flow

```
1. User clicks "Get Quote" → POST /policies/quote → quote stored
2. User goes to checkout → POST /payments/order → Razorpay order created
3. Razorpay.js opens checkout modal
4. User completes payment → handler fires
5. POST /payments/verify with razorpay_signature
6. Backend verifies HMAC → activates policy → sends email
7. Frontend shows success screen
```

---

## Adding a New Page

1. Create `src/app/your-page/page.tsx`
2. If auth-protected, add a redirect check or place inside `(dashboard)/`
3. Import hooks from `@/hooks/` for data fetching
4. Use design system components from `@/components/ui/`

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL |
| `NEXT_PUBLIC_APP_URL` | Frontend origin URL |
