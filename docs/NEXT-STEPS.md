# SpawnKit v2 — Next Steps (Priority Order)

## 🔴 Ship-Critical (before any public showing)

### 1. Real Data Integration (data-bridge.js)
Replace mock data with actual OpenClaw API calls:
- `SpawnKit.api.getSessions()` → GET to OpenClaw sessions endpoint
- `SpawnKit.api.getCrons()` → GET cron jobs  
- `SpawnKit.data.agents` → real agent status from OpenClaw
- WebSocket for live events (mission progress, agent status)
- **Without this, Marcus (power user) won't convert**

### 2. Electron Build & Package
- `npm install` in electron/
- Test full flow: setup wizard → theme selector → office
- Build .dmg (macOS) and .exe (Windows) with electron-builder
- Test on a clean machine (no dev dependencies)
- Code sign for macOS (avoid Gatekeeper issues)

### 3. Domain + Hosting
- Register spawnkit.dev or spawnkit.app
- Deploy landing page to Vercel/Netlify (free tier)
- Set up Stripe Payment Link with live keys
- Wire "Get SpawnKit" button to actual download

### 4. Demo Video (60 seconds)
- Screen record: theme selector → GameBoy boot → office → Q palette → mission → achievement
- Edit with transitions, add chiptune background music
- Upload to landing page + YouTube
- Convert to GIF for social media (15s version)

## 🟡 Pre-Launch Polish

### 5. Real Testimonials
- Ship to 3-5 OpenClaw users for feedback
- Replace placeholder testimonials with real quotes
- Add their Twitter handles/photos

### 6. Product Hunt Prep
- Create "Coming Soon" page
- Write maker's comment
- Prepare 5 screenshots (1200×630, OG optimized)
- Schedule launch for a Saturday

### 7. GitHub Repo Polish
- Push spawnkit-v2 to public github.com/apocys/spawnkit-v2
- Clean README with demo GIF
- Add LICENSE (MIT)
- GitHub releases with .dmg/.exe downloads

## 🟢 Post-Launch Growth

### 8. Content Marketing
- "Show HN: I built a Pokémon-style AI dashboard" post
- Reddit posts in r/ChatGPT, r/artificial, r/IndieHackers
- Twitter thread about the build process
- Dev.to technical article about the architecture

### 9. v2.1 Features (based on feedback)
- Sound toggle persistence (localStorage)
- Custom theme colors
- Agent performance history (charts)
- Real-time notifications
- Auto-update in Electron

### 10. Revenue Optimization
- A/B test pricing ($149 vs $199)
- Add annual license option for teams
- Affiliate program for content creators
- "Refer a friend" discount
