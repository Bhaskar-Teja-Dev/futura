# 🚀 Digital Rebel (Futura) - Frontend

This repository contains the frontend static files (HTML, CSS, JS) for the Digital Rebel / Futura web app.

## 🟢 Live Backend API
The backend functionality (Hono + Supabase connections + Razorpay processing) is already securely deployed and hosted on Cloudflare Workers. 

**Production API Base URL:**
```
https://futura-api.bhaskar-futura.workers.dev
```
*Note: Your `js/config.js` file is already configured to point to this URL.*

---

## 🚀 How to Host This Frontend (Vercel)

Because this repository strictly uses client-side static files (`.html`, `.css`, Vanilla `.js`), you can host it anywhere for free! We recommend **Vercel**.

1. Create a GitHub repository and push these files to it.
2. Go to [Vercel](https://vercel.com/) and click **Add New Project**.
3. Import your GitHub repository.
4. Leave all settings as default (Framework Preset: Other).
5. Click **Deploy**.

Vercel will give you a live URL, such as `https://my-futura-app.vercel.app`.

---

## ⚠️ MANDATORY POST-DEPLOYMENT STEPS

Once Vercel gives you your live frontend URL, you **MUST** update your authentication providers otherwise users will not be able to log in.

### 1. Update Supabase Authentication
Because your logins are handled by Supabase (via Google OAuth), Supabase needs to know it is "safe" to redirect users back to your new Vercel domain.

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Open your project and click **Authentication** (the user icon on the left panel).
3. Under Configuration, click **URL Configuration**.
4. **Site URL:** Change this from `http://localhost` (or `127.0.0.1`) to your new Vercel URL (e.g., `https://my-futura-app.vercel.app`).
5. **Redirect URLs:** Click "Add URL" and add your Vercel URL followed by a wildcard: `https://my-futura-app.vercel.app/*`
6. Click **Save**.

### 2. Google Cloud Console (No Changes Needed!)
Good news! Because we are using Supabase to handle the actual OAuth handshake, the redirect URI saved inside your Google Cloud Console (`https://oorxjgzhscczvflvjwlk.supabase.co/auth/v1/callback`) **does not** need to be changed. Supabase handles the domain shift for you.

### 3. Backend CORS (No Changes Needed!)
The deployed Cloudflare Worker API is currently configured to accept cross-origin requests (`CORS`) from **any** domain (`'*'`). 
If you want to secure it in the future, you can limit the `origin` array in `futura-api/src/index.ts` to your Vercel URL, but for the hackathon, it will work immediately out of the box!
