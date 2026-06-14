# 🤖 DerivAI Agent — Autonomous Trading System

Production-ready AI trading agent for Deriv. Connects to your real Deriv account, runs multi-indicator technical analysis in real-time, generates signals, and executes trades automatically or manually.

## ✨ Features
- **Live Market Data** — Real-time WebSocket to Deriv API
- **AI Signal Engine** — RSI + MACD + Bollinger Bands + EMA + Momentum
- **Autonomous Trading** — AI executes when confidence ≥ your threshold
- **Manual Trading** — One-click RISE/FALL on every signal card
- **Real Execution** — Trades hit your actual Deriv account; balance syncs live
- **Demo & Real Accounts** — Connect and switch freely
- **Risk Management** — Confidence threshold, stake, max daily loss, cooldowns

## 🚀 Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/deriv-ai-agent.git
cd deriv-ai-agent
npm install
cp .env.example .env.local
npm run dev
# Open http://localhost:3000
```

## 🔑 Getting Your Deriv API Token
1. Log in to [app.deriv.com](https://app.deriv.com)
2. Go to **Account Settings → API Token**
3. Create token with **Read + Trade** permissions
4. Paste it into the app → **Connect Account**

## 🌐 Deploy to Vercel

```bash
# Push to GitHub first
git init && git add . && git commit -m "DerivAI Agent"
git remote add origin https://github.com/YOUR/repo.git
git push -u origin main

# Then: vercel.com → New Project → Import GitHub repo
# Add env var: NEXT_PUBLIC_DERIV_APP_ID = 1089
# Deploy ✅
```

## ⚙️ Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_DERIV_APP_ID` | `1089` | Deriv App ID (public, no secret needed) |
| `NEXT_PUBLIC_APP_URL` | — | Your deployed URL |

No server secrets needed — tokens stored in browser only.

## ⚠️ Risk Disclaimer
Trading involves significant risk of loss. Only trade funds you can afford to lose.
