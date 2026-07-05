# Selvage

A wardrobe app: catalog your closet, get outfit suggestions from a rule-based
scoring engine, and get reminded about clothes you own but forgot about.

This is a working prototype — the recommendation logic is real, and the app
is now backed by a real Supabase project behind email/password auth (not
yet a finished product: no photo capture, no item edit/delete).

## What's here

- **Expo Router app** (`app/`) — Today / Closet / Log tabs, an add-item modal,
  and an item detail screen, gated behind a login screen.
- **Recommendation engine** (`src/features/outfits/`) — candidate generation,
  hard filters, and the color-harmony / formality-coherence / novelty /
  neglect-bonus scoring described in the design discussion. Fully unit-testable,
  no ML model required.
- **Auth** (`src/store/useAuthStore.ts`, `src/components/LoginScreen.tsx`) —
  email/password sign-in/sign-up; `app/_layout.tsx` shows the login screen
  until there's a session.
- **Zustand store** (`src/store/useClosetStore.ts`) — current app state,
  loaded from and written back to Supabase.
- **Supabase** (`src/lib/supabase.ts`, `supabase/migrations/`) — client setup
  (session persisted via AsyncStorage) and schema (`items`, `outfit_history`,
  both with row-level security scoped to the authenticated user).
- **Mock closet data** (`src/data/mockItems.ts`) — no longer wired into the
  store; kept around as sample data/seed reference.

## Setup

### 1. Install dependencies

```
npm install
```

Then let Expo align native package versions to your SDK version:

```
npx expo install react-native-svg react-native-safe-area-context react-native-screens expo-image-picker expo-constants
```

### 2. Run it

```
npx expo start
```

Scan the QR code with the Expo Go app on your phone, or press `i` / `a` to
open an iOS/Android simulator if you have one installed. You'll land on a
login screen — set up Supabase (step 3 below) before there's anything to
sign in to.

### 3. Wire up Supabase (required — the app now needs a real backend)

The store is wired to real Supabase queries and gates the whole app behind
email/password auth, so you need a project before the app is usable:

1. Create a project at [supabase.com](https://supabase.com).
2. In the Supabase SQL editor, run `supabase/migrations/0001_init.sql`.
3. Copy `.env.example` to `.env` and fill in your project URL and anon key
   (found in Project Settings → API).
4. Start the app, sign up with an email/password on the login screen, and
   the closet/outfit-history tables will populate as you use it.

### 4. Ship it

Use [EAS Build](https://docs.expo.dev/build/introduction/) to produce iOS and
Android binaries for TestFlight / internal testing / the app stores.

## Where things live

```
app/                    Screens (file-based routing via Expo Router)
src/features/outfits/   The recommendation engine — this is the core IP
src/components/         Shared UI (hang-tag cards, chip selectors, icons)
src/store/               App state
src/data/                Mock data (swap for Supabase once wired in)
src/lib/                 Supabase client
supabase/migrations/    Database schema
```

## Tuning the recommendations

The scoring weights live in `src/features/outfits/scoring.ts`, in
`scoreOutfit()`:

```
total = 0.4 * colorHarmony + 0.25 * formalityCoherence + 0.15 * novelty + 0.20 * neglectBonus
```

If suggestions feel too repetitive, raise the novelty weight. If they feel
too "safe" and never surface forgotten pieces, raise the neglect weight. This
is also where you'd eventually swap in per-user learned weights instead of
one fixed formula for everyone — see the outfit recommendation discussion for
how that feedback loop would work.
