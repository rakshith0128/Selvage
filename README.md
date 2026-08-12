# Selvage

A wardrobe app: catalog your closet, get outfit suggestions from a rule-based
scoring engine, and get reminded about clothes you own but forgot about.

This is a working prototype — the recommendation logic is real, photos are
captured and auto-tagged by a vision model, and the app is backed by a real
Supabase project behind email/password auth.

## What's here

- **Expo Router app** (`app/`) — Today / Closet / Log tabs, an add-item modal
  with camera/library capture, an edit-item screen, and an item detail screen
  (with delete), all gated behind a login screen.
- **Recommendation engine** (`src/features/outfits/`) — candidate generation,
  hard filters, and color-harmony / formality-coherence / novelty /
  neglect-bonus / taste scoring described in the design discussion.
  Fully unit-testable, no ML model required to run it.
- **Per-user learned weights** (`src/features/outfits/learning.ts`) — an SGD
  model over the five scoring terms, updated from wear/like/dislike/shuffle
  feedback (`supabase/migrations/0003_learning.sql`: `outfit_feedback`,
  `user_model`). Cold-start (no feedback yet) matches the original fixed
  formula.
- **Photo capture & storage** (`src/lib/photos.ts`) — camera/library picker
  via `expo-image-picker`, uploads to the `item-photos` Supabase Storage
  bucket (`supabase/migrations/0002_item_photos_storage.sql`).
- **Auto-tagging via Gemini** (`src/lib/analyzeItem.ts`,
  `supabase/functions/analyze-item/`) — a Supabase Edge Function sends the
  photo to Gemini vision (`gemini-2.5-flash`), which returns category,
  color, pattern, formality, and a short name to prefill the add-item form.
  Optional/best-effort: on failure the user just fills the form manually.
- **Auth** (`src/store/useAuthStore.ts`, `src/components/LoginScreen.tsx`) —
  email/password sign-in/sign-up; `app/_layout.tsx` shows the login screen
  until there's a session.
- **Zustand store** (`src/store/useClosetStore.ts`) — current app state,
  loaded from and written back to Supabase.
- **Supabase** (`src/lib/supabase.ts`, `supabase/migrations/`) — client setup
  (session persisted via AsyncStorage) and schema (`items`, `outfit_history`,
  `outfit_feedback`, `user_model`, all with row-level security scoped to the
  authenticated user).
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
2. In the Supabase SQL editor, run the migrations in order:
   `0001_init.sql`, `0002_item_photos_storage.sql`, `0003_learning.sql`.
3. Copy `.env.example` to `.env` and fill in your project URL and anon key
   (found in Project Settings → API).
4. Deploy the auto-tagging edge function and give it a Gemini API key:
   ```
   npx supabase functions deploy analyze-item
   npx supabase secrets set GEMINI_API_KEY=your-key-here
   ```
   Get a key from [Google AI Studio](https://aistudio.google.com/apikey).
   This step is optional — without it, add-item just skips auto-tagging and
   the form is filled in manually.
5. Start the app, sign up with an email/password on the login screen, and
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
src/lib/                 Supabase client, photo capture/upload, Gemini tagging call
supabase/migrations/    Database schema
supabase/functions/     Edge functions (analyze-item: Gemini vision tagging)
```

## Tuning the recommendations

Scoring lives in `src/features/outfits/scoring.ts`, in `scoreOutfit()`:

```
total = w0 * colorHarmony + w1 * formalityCoherence + w2 * novelty + w3 * neglectBonus + w4 * taste
```

The weights `w` come from each user's learned model
(`src/features/outfits/learning.ts`), starting from `DEFAULT_MODEL` and
updated by `sgdUpdate()` whenever the user wears, likes, dislikes, or
shuffles past an outfit — persisted to `user_model` in Supabase. `taste` is
a per-item score derived from that same feedback history via Thompson
sampling (`tasteForItem`), so items the user has consistently liked get
surfaced more.

With no feedback yet, `DEFAULT_MODEL`'s weights reduce to the original fixed
formula (`0.4 / 0.25 / 0.15 / 0.2` on the first four terms, taste neutral at
0.5), so cold-start ranking is unaffected by the learning layer. If you want
to change the starting point for new users, edit `DEFAULT_MODEL.w` in
`learning.ts`.
