# 🎧 Random Album Picker

A fun, minimalist web app that helps you discover new albums from your favorite artists — by picking a **random album** from a selected artist or a **custom artist pool**.

> ✨ Built with love using Spotify + Apple Music APIs.

---

## 🧠 Features

- 🎲 Pick a **random album** from any artist.
- 🧑‍🎤 Create a **pool of multiple artists** — like a playlist, but for artists.
- 🔗 Direct links to listen on:
  - **Spotify** (deep links for app launch)
  - **Apple Music** (universal links)
- 💾 (Coming soon) Save your favorite artists & pools using a simple login system.

---

## 📸 Preview

![app-preview](./screenshot.png) <!-- Add a screenshot later if you want -->

---

## 🚀 How it Works

- Type an artist name, get a random album.
- Or create a pool of artists, and let the app pick an album from a **random artist in your mood-pool**.
- Works with real-time data via:
  - Spotify API
  - iTunes Search API

---

## 📦 Tech Stack

- **Frontend**: Next.js 15 (App Router)
- **Backend**: Node.js + Express
- **APIs**: Spotify + iTunes
- **Hosting**: Localhost / Vercel / Render
- **Auth (Planned)**: Supabase / NextAuth

---

## ⚙️ Run Locally

```bash
git clone https://github.com/your-username/random-album-picker
cd random-album-picker
npm install
npm run dev
