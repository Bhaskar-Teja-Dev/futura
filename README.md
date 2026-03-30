# Digital Rebel (Futura) 🚀

**Digital Rebel** (codenamed "Futura") is a provocative, gamified personal finance and retirement planning web application. Designed with a neo-brutalist aesthetic, it transforms traditional retirement planning into an engaging, dynamic experience through virtual currency, AI-driven projections, and streak-based gamification.

---

## Drive Link for Demo Video :
https://drive.google.com/file/d/1ok30D5cx84UnO5U9_bZ1rEp2xS4XBoKl/view?usp=sharing

## 🌟 Novelty & Gamification

Digital Rebel challenges mundane finance trackers by introducing intense gamification:
- **ZENS (Virtual Currency):** Users earn, purchase, and spend ZENS within the app to unlock features or simulate high-risk market trades without risking real capital.
- **Contributions & Streaks:** Users build and maintain "savings streaks" by logging regular contributions. Missing a month breaks the streak.
- **Elite Tier & Streak Recovery:** Users can purchase an "Elite" subscription (via Razorpay) to unlock Streak Recovery Tokens, ensuring their hard-earned streaks survive missed months. 
- **AI-Driven Alpha (Rebel Signals):** Translates user portfolios into actionable (simulated) algorithmic trading insights based on real-time market data models.

---

## ⚙️ Tech Stack

Futura is built on a split-stack architecture, utilizing a lightweight static frontend interacting with a highly scalable serverless backend.

### Frontend
- **HTML/CSS/JS:** Pure Vanilla JavaScript and HTML for maximum performance and explicit DOM control.
- **Styling:** **Tailwind CSS v3** compiled via PostCSS, featuring a custom Neo-Brutalist design system (custom primary `#cafd00`, stark borders, hard shadows).
- **Icons & Typography:** Material Symbols Outlined, Google Fonts (Lexend, Inter).
- **Payments:** Razorpay integration for ZENS top-ups and Elite subscriptions.

### Backend (API)
- **Framework:** **Hono.js** framework running on **Cloudflare Workers**.
- **Language:** TypeScript (`futura-api/`).
- **Authentication:** **Supabase Auth** (Google OAuth + JWT Bearer tokens).
- **Validation:** Zod schemas via `@hono/zod-validator`.

### Database
- **Provider:** **Supabase (PostgreSQL)** featuring strict Row-Level Security (RLS) policies.

---

## 🗄 Database Structure (Supabase)

The database models user profiles, financial goals, gamification mechanics, and subscriptions.

| Table | Key Columns | Description |
|---|---|---|
| **`profiles`** | `id`, `email`, `display_name`, `age`, `retirement_age`, `monthly_income`, `zens`, `onboarding_complete` | Core user identity, tracking the current ZENS virtual balance. |
| **`user_goals`** | `user_id`, `current_age`, `retirement_age`, `target_monthly_income`, `annual_return_rate`, `risk_profile` | Financial targets used by the Monte Carlo projection engine. |
| **`contributions`** | `id`, `user_id`, `amount`, `contribution_date`, `note`, `currency` | A ledger of user savings and investments. |
| **`streaks`** | `user_id`, `current_streak`, `longest_streak`, `previous_streak`, `last_contribution_date` | Gamification tracking for continuous monthly contributions. |
| **`user_subscriptions`**| `user_id`, `entitlement` (`free`/`pro`/`elite`), `streak_recovery_tokens`, `expires_at` | Manages paywalled features and recovery token economies. |

---

## 🖥 Core Features & Project Structure

The frontend consists of statically served pages seamlessly hydrated via the Cloudflare Worker API.

### `futura/` Root (Frontend)
- **`index.html`:** The landing page and Google OAuth entry point.
- **`dashboard_digital_rebel_desktop.html`:** The central hub displaying active streaks, ZENS balances, and high-level projections.
- **`market_digital_rebel_desktop.html`:** A simulated asset market where users can spend ZENS on virtual stocks to test volatility.
- **`projections_digital_rebel_desktop.html`:** A heavy Monte Carlo math engine visualizing corpus growth through interactive charts.
- **`transactions.html`:** Contribution history and CSV export functionality.
- **`cards_digital_rebel_desktop.html`:** Virtual debit/credit card management UI.
- **`upgrade_digital_rebel_desktop.html` & `checkout_digital_rebel_desktop.html`:** Razorpay monetization flows.

### `futura-api/src/` (Backend)
- **`/lib/calculator.ts`:** Handles complex retirement ROI math and compounding projections.
- **`/middleware/auth.ts`:** Intercepts Supabase JWTs to ensure robust route protection.
- **`/routes/contributions.ts`:** Manages the streak algorithm, ensuring streaks break or increment conditionally based on timestamps.
- **`/routes/projection.ts`:** Exposes Elite features like multi-scenario comparisons and PDF Generation.
- **`/routes/zens.ts & subscriptions.ts`:** Securely processes Razorpay payment webhooks to credit accounts.

---

## 🚀 Setup & Execution

### 1. Database Setup
1. Create a Supabase project.
2. Apply the SQL migrations located in `supabase/migrations/` to initialize tables and RLS.
3. Obtain your `SUPABASE_URL` and `SUPABASE_ANON_KEY`.

### 2. API Setup (Cloudflare Workers)
1. Navigate to the API directory:
   ```bash
   cd futura-api
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Update `wrangler.toml` with your specific Supabase credentials and Razorpay keys.
4. Run locally for testing:
   ```bash
   npm run dev
   ```

### 3. Frontend Setup
1. Open `js/config.js` and set your `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `RAZORPAY_KEY`, and `API_URL` (e.g., `http://localhost:8787` for local dev).
2. Host the root `futura/` directory on any static file server (e.g., VS Code Live Server, Vercel, or Nginx).
3. Navigate to `index.html` to begin the experience.

---

## 📝 License
© DIGITAL REBEL. All Rights Reserved. Not financial advice. Numbers are illustrative.
