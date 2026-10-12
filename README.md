# 🏯 Mukesh Ojha weds Puja — Royal Wedding Invitation

A cinematic royal Indian wedding invitation website built with **Astro 5**, **Tailwind CSS v4**, **React**, **GSAP**, **Three.js**, **Lenis**, and more.

---

## ✨ Features

| Category | Details |
|---|---|
| **Preloader** | Palace-door (Jharokha) swing-open with diya & progress counter |
| **Hero** | Parallax silhouette layers, letter-by-letter gold shimmer reveal, rotating SVG mandala |
| **Particles** | Floating marigold petals + golden dust reacting to mouse via canvas |
| **Three.js** | 200-particle golden diya field in the hero background |
| **Cursor** | Gold glowing dot with diya trail, grows on hover |
| **Scroll** | Lenis smooth scroll + gold progress bar at top |
| **SVG Draw** | Mandala, paisley & arch borders animate as they enter viewport |
| **Countdown** | 3D flip-clock (Days · Hours · Minutes · Seconds) to 11 Dec 2026 19:00 IST |
| **Couple Cards** | Arch-framed portraits with clip-path reveal + cursor-tracking glow |
| **Story** | Vertical timeline with GSAP ScrollTrigger stagger |
| **Events** | 3D tilt cards with glare, gold border trace, hover colour flip |
| **Gallery** | Bento grid with gold shine sweep on hover |
| **RSVP** | Floating-label inputs + confetti/firework burst on submit |
| **Venue** | Google Maps embed in arch frame + travel guide |
| **Audio** | Shehnai toggle widget (muted by default) |
| **Calendar** | `.ics` download button |
| **WhatsApp** | Share link with `#MukeshWedsPuja` |
| **Marquee** | Infinite `#MukeshWedsPuja` ticker |
| **Footer** | Floating lanterns, hashtag, thank-you note |
| **SEO** | Open Graph, Twitter Card, Structured Data (JSON-LD) |
| **Accessibility** | `prefers-reduced-motion` respected, aria labels |

---

## 🛠 Tech Stack

```
Astro 5 (static output)    Tailwind CSS v4
@astrojs/react             Framer Motion
GSAP + ScrollTrigger       Lenis (smooth scroll)
Three.js                   tsparticles
lottie-web                 Howler.js
Swiper                     canvas-confetti
vanilla-tilt               
```

---

## 🚀 Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Start dev server (http://localhost:4321)
npm run dev

# 3. Build for production
npm run build

# 4. Preview production build
npm run preview
```

---

## 📁 Folder Structure

```
src/
  layouts/
    Layout.astro          # Base HTML shell, SEO, cursor, scroll bar
  pages/
    index.astro           # All sections assembled here
  styles/
    global.css            # Design tokens, animations, Tailwind base
  components/             # (future reusable Astro components)
  islands/                # (future React islands)
public/
  og-image.jpg            # Open Graph preview image
  favicon.svg             # SVG favicon
```

---

## 🌐 Deploy to Vercel

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy
vercel --prod
```

Or connect the GitHub repo to Vercel → set **Framework: Astro** → deploy automatically.

### Vercel config (`vercel.json`)
```json
{
  "framework": "astro",
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

---

## 🌐 Deploy to Netlify

```bash
# 1. Build
npm run build

# 2. Drag & drop the `dist/` folder to app.netlify.com
```

Or connect GitHub → **Build command:** `npm run build` → **Publish directory:** `dist`

---

## 📋 RSVP Storage (Google Sheets via Apps Script)

1. Create a Google Sheet named **MukeshWedsPuja RSVP**
2. Go to **Extensions → Apps Script** and paste:

```js
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = JSON.parse(e.postData.contents);
  sheet.appendRow([new Date(), data.name, data.phone, data.guests, data.food, data.ceremonies, data.wishes]);
  return ContentService.createTextOutput(JSON.stringify({status:'ok'})).setMimeType(ContentService.MimeType.JSON);
}
```

3. **Deploy → New deployment → Web app → Anyone can access**
4. Copy the deployment URL and set it as the `action` in `src/pages/index.astro` RSVP form fetch.

---

## 📅 Calendar Event

The "Save the Date" button downloads `MukeshWedsPuja.ics` which contains:
- **Event:** Mukesh Ojha weds Puja | #MukeshWedsPuja
- **Date:** 11 December 2026, 18:30 UTC (19:00 IST)
- **Location:** Grand Rajwada Mandap, Dugda, Bokaro

---

## 📱 Tested Breakpoints

| Viewport | Status |
|---|---|
| 375px (iPhone SE) | ✅ |
| 768px (iPad) | ✅ |
| 1440px (Desktop) | ✅ |

---

## 🎨 Design System

| Token | Value |
|---|---|
| Primary Gold | `#E0B84F` |
| Gold Light | `#FED467` |
| Gold Dim | `#EAC258` |
| Midnight | `#0B0A1A` |
| Surface | `#131222` |
| Rose (Bride) | `#FFB1C7` |
| Headline Font | Playfair Display |
| Body Font | Montserrat |

---

*Made with ❤️ for Mukesh Ojha & Puja · #MukeshWedsPuja*
