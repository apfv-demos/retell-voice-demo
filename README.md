# Retell Voice Agent Demo

A secure, one-click-deployable template for demoing Retell AI voice agents on your website. Built with abuse prevention in mind: Google authentication, invisible reCAPTCHA, and configurable usage quotas.

## Deploy to Vercel (One Click)

> **Before clicking**, you'll need API keys from the services listed in [Prerequisites](#prerequisites) below.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fapfv-demos%2Fretell-voice-demo&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,SUPABASE_SERVICE_ROLE_KEY,RETELL_API_KEY,RETELL_AGENT_ID,NEXT_PUBLIC_RECAPTCHA_SITE_KEY,RECAPTCHA_SECRET_KEY&envDescription=See%20.env.example%20for%20details&envDefaults=NEXT_PUBLIC_MAX_CALLS_PER_DAY%3D5%2CNEXT_PUBLIC_MAX_CALL_DURATION_SECONDS%3D120%2CNEXT_PUBLIC_APP_NAME%3DVoice%20Agent%20Demo%2CNEXT_PUBLIC_APP_DESCRIPTION%3DTalk%20to%20our%20AI%20agent!)

---

## Prerequisites

You need accounts and API keys from four services. Follow each step below.

### 1. Retell AI

1. Sign up at [app.retellai.com](https://app.retellai.com)
2. Create an agent (or use an existing one)
3. Copy your **API Key** from Settings > API Keys
4. Copy your **Agent ID** from the agent page

You'll need:
- `RETELL_API_KEY` = your API key
- `RETELL_AGENT_ID` = your agent ID

### 2. Supabase

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard)
2. Go to **Settings > API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - **service_role key** → `SUPABASE_SERVICE_ROLE_KEY`

3. **Enable Google Auth**: Go to **Authentication > Providers > Google** and enable it. You'll need the Google OAuth Client ID and Secret from step 3 below. Note the **Callback URL** shown here — you'll need it for Google Cloud.

4. **Run the database migration**: Go to **SQL Editor** and run this SQL:

```sql
CREATE TABLE public.call_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  retell_call_id TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'initiated'
);

CREATE INDEX idx_call_logs_user_day
  ON public.call_logs (user_id, started_at);

ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own call logs"
  ON public.call_logs FOR SELECT
  USING (auth.uid() = user_id);
```

5. **Add redirect URL**: Go to **Authentication > URL Configuration** and add your deployment URL:
   - `https://YOUR-APP.vercel.app/auth/callback`

### 3. Google Cloud (OAuth)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or select an existing one)
3. Go to **APIs & Services > Credentials > Create Credentials > OAuth Client ID**
4. Choose **Web application**
5. Add authorized redirect URI: paste the **Callback URL** from Supabase (step 2.3)
6. Copy the **Client ID** and **Client Secret** and paste them into Supabase's Google provider settings (step 2.3)

### 4. Google reCAPTCHA v3

1. Go to [reCAPTCHA Admin](https://www.google.com/recaptcha/admin)
2. Register a new site → choose **reCAPTCHA v3**
3. Add your domain (e.g., `your-app.vercel.app`)
4. Copy:
   - **Site Key** → `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
   - **Secret Key** → `RECAPTCHA_SECRET_KEY`

---

## Environment Variables

| Variable | Where to get it | Public? |
|----------|----------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase > Settings > API | Yes |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase > Settings > API (anon key) | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase > Settings > API | **No** |
| `RETELL_API_KEY` | Retell > Settings > API Keys | **No** |
| `RETELL_AGENT_ID` | Retell > Agent page | **No** |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | reCAPTCHA Admin | Yes |
| `RECAPTCHA_SECRET_KEY` | reCAPTCHA Admin | **No** |
| `NEXT_PUBLIC_MAX_CALLS_PER_DAY` | Your choice (default: `5`) | Yes |
| `NEXT_PUBLIC_MAX_CALL_DURATION_SECONDS` | Your choice (default: `120`) | Yes |
| `NEXT_PUBLIC_APP_NAME` | Your choice | Yes |
| `NEXT_PUBLIC_APP_DESCRIPTION` | Your choice | Yes |

---

## Local Development

```bash
git clone https://github.com/apfv-demos/retell-voice-demo.git
cd retell-voice-demo
npm install
cp .env.example .env.local
# Fill in .env.local with your keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

For local Google OAuth, add `http://localhost:3000/auth/callback` to your Supabase redirect URLs.

---

## Customization

- **Change the voice agent**: Update `RETELL_AGENT_ID` in your environment variables
- **Change quotas**: Update `NEXT_PUBLIC_MAX_CALLS_PER_DAY` and `NEXT_PUBLIC_MAX_CALL_DURATION_SECONDS`
- **Change branding**: Update `NEXT_PUBLIC_APP_NAME` and `NEXT_PUBLIC_APP_DESCRIPTION`
- **Change colors**: Edit the gradient classes in `components/BlobAnimation.tsx` and `components/CallControls.tsx`

---

## How It Works

1. User visits the page and sees the demo description
2. User signs in with Google (via Supabase Auth)
3. User clicks "Start Call" →
   - Browser silently gets a reCAPTCHA score
   - Server verifies auth, reCAPTCHA score, and daily quota
   - Server creates a Retell web call and logs it
   - Browser connects to Retell using the access token
4. A blob animation pulses when the agent is speaking
5. Call auto-disconnects after the configured time limit

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Google sign-in redirects to an error | Make sure the Callback URL in Google Cloud matches the one shown in Supabase's Google provider settings |
| "auth_failed" after sign-in | Add `https://YOUR-APP.vercel.app/auth/callback` to Supabase > Authentication > URL Configuration > Redirect URLs |
| reCAPTCHA not loading | Add your domain to the reCAPTCHA v3 site settings at [reCAPTCHA Admin](https://www.google.com/recaptcha/admin) |
| "Failed to start call" | Check that `RETELL_API_KEY` and `RETELL_AGENT_ID` are correct in your environment variables |
| Microphone not working | Allow microphone access in your browser when prompted. HTTPS is required (Vercel provides this automatically) |
| Call logs not showing | Make sure you ran the SQL migration in Supabase SQL Editor |

---

## Tech Stack

- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - Auth & database
- [Retell AI](https://retellai.com/) - Voice agent platform
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Google reCAPTCHA v3](https://developers.google.com/recaptcha/docs/v3) - Bot protection
