# Forma — Google sign-in (Supabase Auth)

Forma uses **Supabase Auth** with **Google OAuth**. Guests can still use the app without signing in.

## 1. Create a Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. Copy **Project URL** and **anon public** key from **Settings → API**

## 2. Enable Google provider

In Supabase → **Authentication → Providers → Google**:

1. Turn **Google** on
2. You'll need a **Google Cloud OAuth client** (step 3)
3. Paste **Client ID** and **Client Secret** from Google
4. Copy Supabase's **Callback URL** (looks like `https://YOUR_PROJECT.supabase.co/auth/v1/callback`)

## 3. Google Cloud Console

1. [console.cloud.google.com](https://console.cloud.google.com) → **APIs & Services → Credentials**
2. **Create Credentials → OAuth client ID → Web application**
3. **Authorized JavaScript origins:**
   - `http://localhost:3000`
   - `https://www.shopwithforma.com`
   - `https://shopwithforma.com`
4. **Authorized redirect URIs:**
   - Supabase callback URL from step 2
5. Copy Client ID + Secret into Supabase Google provider settings

## 4. Environment variables

Add to `.env.local` and **Vercel → Settings → Environment Variables**:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Redeploy after adding to Vercel.

## 5. Supabase URL configuration

In Supabase → **Authentication → URL Configuration**:

| Field | Value |
|-------|--------|
| Site URL | `https://www.shopwithforma.com` |
| Redirect URLs | `https://www.shopwithforma.com/auth/callback`, `https://shopwithforma.com/auth/callback`, `http://localhost:3000/auth/callback` |

## 6. Cloud scans + server quota (recommended for production)

1. In Supabase → **SQL Editor**, run the script in **`supabase/schema.sql`** in this repo.
2. Run **`supabase/shared-verdicts.sql`** in the same editor (public share links). Safe to re-run. Do this even if `schema.sql` was applied earlier.
3. Add **`SUPABASE_SERVICE_ROLE_KEY`** to Vercel env (Settings → API → service role). **Never expose it to the client.** Required for server scan limits, Stripe webhooks, and creating share links.
4. Redeploy. Free scans are enforced on the server; signed-in users sync scan history to Supabase. Shared verdicts are written only by the server and can be opened by anyone with the link.

## 7. Test locally

```bash
npm run dev
```

Open `/login` or **Profile → Sign in with Google**.

## Where sign-in appears

- `/login` — dedicated sign-in page
- `/profile` — sign in / sign out
- Landing header — **Sign in** link
- Sidebar — shows Google name + avatar when signed in

## Notes

- Scan history still saves to **localStorage** for now (cloud sync can come later)
- Without Supabase env vars, the app works as **guest only**
- Google sign-in automatically creates a Supabase user on first login
