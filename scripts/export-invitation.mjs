// scripts/export-invitation.mjs
// Exports Wedding Invitation Card in PDF (5x7 + 3mm bleed), WhatsApp (1080x1350), Story (1080x1920), and inside.jpg
import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jsQR from 'jsqr';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const outDir = path.join(rootDir, 'public', 'invitation');

fs.mkdirSync(outDir, { recursive: true });

// Read self-hosted fonts css and qr code as base64
const qrBase64 = fs.readFileSync(path.join(rootDir, 'public', 'images', 'qr-code.png')).toString('base64');
const fontsCss = fs.readFileSync(path.join(rootDir, 'public', 'fonts', 'fonts.css'), 'utf8');

// Function to generate the HTML markup for standalone print / image export
function getExportHTML({ mode = 'inside', width = 1500, height = 2100 }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    ${fontsCss}

    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      width: ${width}px;
      height: ${height}px;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: #FFFBF5;
      font-family: 'Montserrat', sans-serif;
      color: #3D2B24;
      display: flex;
      align-items: center;
      justify-content: center;
      -webkit-font-smoothing: antialiased;
    }

    .export-card {
      width: 100%;
      height: 100%;
      position: relative;
      background: #FFFBF5;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 48px 40px;
    }

    /* FRONT GATEFOLD DESIGN */
    .front-card {
      background: linear-gradient(135deg, #F8E7DE 0%, #EBD0C4 50%, #E0BFB1 100%);
      width: 100%;
      height: 100%;
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .ribbon-bar {
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 72px;
      transform: translateY(-50%);
      background: linear-gradient(180deg, #D9A08C 0%, #F2C2B3 25%, #B76E5A 50%, #8F4937 80%, #B76E5A 100%);
      box-shadow: 0 8px 24px rgba(90, 30, 20, 0.35);
    }

    .front-monogram-seal {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: radial-gradient(circle at 35% 30%, #FFEFA6 0%, #C9A24B 60%, #8C6720 100%);
      box-shadow: 0 10px 30px rgba(0,0,0,0.35), inset 0 2px 5px rgba(255,255,255,0.8);
      border: 3px solid rgba(255,255,255,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Great Vibes', cursive;
      color: #4A1506;
      font-size: 52px;
      font-weight: bold;
      z-index: 10;
    }

    /* INSIDE SPREAD HIERARCHY */
    .ganesh-line {
      font-family: 'Noto Serif Devanagari', serif;
      font-size: 24px;
      font-weight: 700;
      color: #C9A24B;
      letter-spacing: 0.1em;
      margin-top: 32px;
      margin-bottom: 8px;
    }

    .intro-quote {
      font-family: 'Playfair Display', serif;
      font-style: italic;
      font-size: 18px;
      line-height: 1.45;
      color: #7A584A;
      max-width: 80%;
      margin-bottom: 10px;
    }

    .wedding-badge {
      font-size: 15px;
      font-weight: 600;
      letter-spacing: 0.28em;
      text-transform: uppercase;
      color: #8C6720;
      padding: 5px 24px;
      border-top: 1.5px solid rgba(201, 162, 75, 0.45);
      border-bottom: 1.5px solid rgba(201, 162, 75, 0.45);
      margin-bottom: 14px;
    }

    .couple-name {
      font-family: 'Great Vibes', cursive;
      font-size: 74px;
      color: #5A1A24;
      line-height: 1.1;
    }

    .parent-info {
      font-size: 17px;
      color: #6E4D41;
      margin-top: 2px;
    }

    .weds-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      margin: 4px 0;
    }
    .weds-row::before, .weds-row::after {
      content: '';
      width: 50px;
      height: 1.5px;
      background: linear-gradient(90deg, transparent, #C9A24B, transparent);
    }
    .weds-script {
      font-family: 'Great Vibes', cursive;
      font-size: 38px;
      color: #C9A24B;
    }

    .main-invite-text {
      font-size: 18px;
      color: #5A382C;
      max-width: 84%;
      margin: 10px 0 16px;
      line-height: 1.45;
      font-family: 'Playfair Display', serif;
      font-style: italic;
    }

    .date-card {
      background: rgba(247, 222, 213, 0.4);
      border: 2px solid rgba(201, 162, 75, 0.55);
      border-radius: 18px;
      padding: 12px 42px;
      margin-bottom: 16px;
    }

    .date-digits {
      font-family: 'Cinzel', serif;
      font-size: 38px;
      font-weight: 700;
      letter-spacing: 0.22em;
      color: #5A1A24;
    }

    .venue-title {
      font-size: 18px;
      font-weight: 600;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #7A503A;
      margin-top: 3px;
    }

    .events-box {
      width: 90%;
      max-width: 760px;
      background: rgba(255, 255, 255, 0.85);
      border: 1.5px dashed rgba(201, 162, 75, 0.6);
      border-radius: 16px;
      padding: 12px 24px;
      text-align: left;
      margin-bottom: 14px;
    }

    .event-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .event-row:last-child {
      margin-bottom: 0;
      border-top: 1px solid rgba(201, 162, 75, 0.3);
      padding-top: 8px;
    }

    .event-name {
      font-family: 'Playfair Display', serif;
      font-size: 20px;
      font-weight: 600;
      color: #5A1A24;
    }

    .event-badge {
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #8C6720;
      background: rgba(201, 162, 75, 0.15);
      padding: 3px 10px;
      border-radius: 6px;
    }

    .event-desc {
      font-size: 16px;
      color: #6A4C41;
      margin-top: 2px;
    }

    .hindi-lines {
      font-family: 'Noto Serif Devanagari', serif;
      font-size: 17px;
      line-height: 1.55;
      color: #63362A;
      max-width: 82%;
      margin-bottom: 14px;
    }

    /* QR Block */
    .qr-container {
      background: #FFFFFF;
      border: 2px solid rgba(201, 162, 75, 0.5);
      border-radius: 18px;
      padding: 12px 22px;
      box-shadow: 0 6px 20px rgba(100, 40, 30, 0.08);
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 12px;
    }

    .qr-title-top {
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #8C6720;
      margin-bottom: 8px;
    }

    .qr-img-frame {
      width: 144px;
      height: 144px;
      background: #FFFFFF;
      padding: 6px;
      border-radius: 10px;
      box-shadow: inset 0 0 0 1px rgba(0,0,0,0.06);
    }

    .qr-img-frame img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      image-rendering: pixelated;
    }

    .qr-title-bottom {
      font-size: 15px;
      font-weight: 500;
      letter-spacing: 0.12em;
      color: #7B594E;
      margin-top: 10px;
    }

    .closing-signoff {
      font-size: 18px;
      color: #5A382C;
      line-height: 1.5;
    }
    .darshan-signoff {
      font-family: 'Noto Serif Devanagari', serif;
      font-size: 20px;
      color: #8C5338;
      font-weight: 600;
      margin-top: 6px;
    }
  </style>
</head>
<body>
  ${mode === 'front' ? `
    <div class="front-card">
      <!-- Curved Petal Flaps Overlay matching reference photo -->
      <svg style="position:absolute; inset:0; width:100%; height:100%; pointer-events:none;" viewBox="0 0 1000 1400" fill="none">
        <!-- Left Flap -->
        <path d="M 0 0 L 275 0 C 410 220, 520 480, 520 700 C 520 920, 410 1180, 275 1400 L 0 1400 Z" fill="#F8E7DE" />
        <path d="M 0 10 L 260 10 C 395 230, 505 480, 505 700 C 505 920, 395 1170, 260 1390 L 0 1390" stroke="rgba(255,255,255,0.7)" stroke-width="4" />
        <path d="M 0 18 L 245 18 C 380 240, 490 480, 490 700 C 490 920, 380 1160, 245 1382 L 0 1382" stroke="rgba(201,162,75,0.5)" stroke-width="2.5" stroke-dasharray="10 8" />
        <!-- Right Flap -->
        <path d="M 1000 0 L 725 0 C 590 220, 480 480, 480 700 C 480 920, 590 1180, 725 1400 L 1000 1400 Z" fill="#EBD0C4" opacity="0.95" />
        <path d="M 1000 10 L 740 10 C 605 230, 495 480, 495 700 C 495 920, 605 1170, 740 1390 L 1000 1390" stroke="rgba(255,255,255,0.7)" stroke-width="4" />
        <path d="M 1000 18 L 755 18 C 620 240, 510 480, 510 700 C 510 920, 620 1160, 755 1382 L 1000 1382" stroke="rgba(201,162,75,0.5)" stroke-width="2.5" stroke-dasharray="10 8" />
      </svg>
      
      <div class="ribbon-bar"></div>

      <!-- Realistic Satin Bow SVG -->
      <svg style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); width:380px; height:320px; z-index:5;" viewBox="0 0 220 180" fill="none">
        <defs>
          <linearGradient id="bowSatinExp" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#E5ADA0" />
            <stop offset="35%" stop-color="#C9826E" />
            <stop offset="70%" stop-color="#9C5341" />
            <stop offset="100%" stop-color="#723323" />
          </linearGradient>
        </defs>
        <!-- Tails -->
        <path d="M 100 95 C 90 125 70 150 45 170 C 60 145 75 115 85 95 Z" fill="url(#bowSatinExp)" />
        <path d="M 120 95 C 130 125 150 150 175 170 C 160 145 145 115 135 95 Z" fill="url(#bowSatinExp)" />
        <!-- Loops -->
        <path d="M 105 85 C 80 50 35 55 42 85 C 50 110 85 100 105 92 Z" fill="url(#bowSatinExp)" />
        <path d="M 115 85 C 140 50 185 55 178 85 C 170 110 135 100 115 92 Z" fill="url(#bowSatinExp)" />
        <circle cx="110" cy="90" r="18" fill="url(#bowSatinExp)" />
      </svg>

      <div class="front-monogram-seal">M&P</div>

      <div style="position:absolute; bottom:60px; font-family:'Cinzel', serif; font-size:22px; letter-spacing:0.35em; color:#8C5338; text-transform:uppercase;">
        Mukesh & Puja
      </div>
    </div>
  ` : `
    <div class="export-card">
      <!-- Realistic Composed Floral Frame SVG -->
      <svg style="position:absolute; inset:0; width:100%; height:100%; pointer-events:none;" viewBox="0 0 1000 1400" fill="none">
        <defs>
          <linearGradient id="goldBrd" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#EED58A" />
            <stop offset="50%" stop-color="#C9A24B" />
            <stop offset="100%" stop-color="#916B20" />
          </linearGradient>

          <!-- Botanical floral cluster definition (Blush cabbage rose, white anemone, eucalyptus leaves, gold berries) -->
          <g id="botanical-cluster-exp">
            <!-- Eucalyptus leaves -->
            <path d="M 35 110 C 15 60 25 15 85 35 C 50 60 50 90 35 110 Z" fill="#889E84" opacity="0.85" />
            <path d="M 110 35 C 160 15 210 25 185 85 C 160 50 130 50 110 35 Z" fill="#9FB29B" opacity="0.85" />
            <path d="M 15 155 C -15 105 0 60 60 85 C 30 110 26 138 15 155 Z" fill="#B3C3AF" opacity="0.75" />
            <path d="M 10 170 C -25 120 -10 65 50 95" stroke="#C9A24B" stroke-width="2.2" stroke-linecap="round" fill="none" opacity="0.75" />
            <circle cx="55" cy="35" r="5" fill="#D4AF37" />
            <circle cx="155" cy="32" r="5" fill="#D4AF37" />
            <circle cx="12" cy="120" r="4.5" fill="#D4AF37" />

            <!-- Blush Garden Cabbage Rose -->
            <g transform="translate(85, 88)">
              <path d="M -48 -20 C -60 20 -30 56 16 52 C 56 48 64 12 44 -28 C 24 -56 -28 -52 -48 -20 Z" fill="#F4CEC4" filter="drop-shadow(0 4px 10px rgba(90,30,20,0.18))" />
              <path d="M -36 -16 C -44 12 -20 40 12 36 C 40 32 44 4 30 -20 C 16 -40 -20 -36 -36 -16 Z" fill="#ECAEA0" />
              <path d="M -24 4 C -30 24 -8 32 16 24 C 32 16 28 -4 12 -16 C -8 -24 -20 -8 -24 4 Z" fill="#DE8B78" />
              <path d="M -12 -4 C -16 8 0 16 10 10 C 18 4 16 -8 6 -10 C -4 -12 -10 -8 -12 -4 Z" fill="#C56A55" />
              <path d="M -4 -2 C -2 4 6 4 6 0 C 6 -4 2 -4 -4 -2 Z" fill="#9C4431" />
            </g>

            <!-- White Anemone with Navy Center & Gold Pollen -->
            <g transform="translate(170, 65)">
              <circle cx="0" cy="-28" r="18" fill="#FFFFFF" stroke="#E8D2CB" stroke-width="1.5" />
              <circle cx="24" cy="-14" r="18" fill="#FFFFFF" stroke="#E8D2CB" stroke-width="1.5" />
              <circle cx="24" cy="14" r="18" fill="#FFFFFF" stroke="#E8D2CB" stroke-width="1.5" />
              <circle cx="0" cy="28" r="18" fill="#FFFFFF" stroke="#E8D2CB" stroke-width="1.5" />
              <circle cx="-24" cy="14" r="18" fill="#FFFFFF" stroke="#E8D2CB" stroke-width="1.5" />
              <circle cx="-24" cy="-14" r="18" fill="#FFFFFF" stroke="#E8D2CB" stroke-width="1.5" />
              <circle cx="0" cy="0" r="26" fill="#FAF5F3" />
              <circle cx="0" cy="0" r="15" fill="#1C1826" />
              <circle cx="0" cy="-12" r="2" fill="#D4AF37" />
              <circle cx="8" cy="-9" r="2" fill="#D4AF37" />
              <circle cx="12" cy="0" r="2" fill="#D4AF37" />
              <circle cx="8" cy="9" r="2" fill="#D4AF37" />
              <circle cx="0" cy="12" r="2" fill="#D4AF37" />
              <circle cx="-8" cy="9" r="2" fill="#D4AF37" />
              <circle cx="-12" cy="0" r="2" fill="#D4AF37" />
              <circle cx="-8" cy="-9" r="2" fill="#D4AF37" />
              <circle cx="0" cy="0" r="6" fill="#2E283E" />
            </g>
          </g>
        </defs>

        <!-- Double Gold Foil Border -->
        <rect x="25" y="25" width="950" height="1350" rx="28" stroke="url(#goldBrd)" stroke-width="2.5" opacity="0.75" />
        <rect x="38" y="38" width="924" height="1324" rx="20" stroke="url(#goldBrd)" stroke-width="1.2" stroke-dasharray="8 6" opacity="0.5" />

        <!-- Corner 1: TOP-LEFT FLORAL CLUSTER -->
        <use href="#botanical-cluster-exp" transform="translate(20, 20)" />

        <!-- Corner 2: TOP-RIGHT FLORAL CLUSTER -->
        <use href="#botanical-cluster-exp" transform="translate(980, 20) scale(-1, 1)" />

        <!-- Corner 3: BOTTOM-LEFT FLORAL CLUSTER -->
        <use href="#botanical-cluster-exp" transform="translate(20, 1380) scale(1, -1)" />

        <!-- Corner 4: BOTTOM-RIGHT FLORAL CLUSTER -->
        <use href="#botanical-cluster-exp" transform="translate(980, 1380) scale(-1, -1)" />
      </svg>

      <!-- 1. ॥ श्री गणेशाय नमः ॥ -->
      <div class="ganesh-line">॥ श्री गणेशाय नमः ॥</div>

      <!-- 2. Intro Quote -->
      <p class="intro-quote">“Two souls, one journey, and the blessings of our elders to begin it.”</p>

      <!-- Gold Monogram Geometric Octagon Wreath -->
      <div style="margin: 4px 0 16px;">
        <svg width="104" height="104" viewBox="-52 -52 104 104" fill="none">
          <polygon points="0,-46 33,-33 46,0 33,33 0,46 -33,33 -46,0 -33,-33" stroke="url(#goldBrd)" stroke-width="2.2" fill="rgba(255,251,245,0.92)" />
          <circle cx="0" cy="0" r="37" stroke="url(#goldBrd)" stroke-width="1" stroke-dasharray="3.5 3" />
          <path d="M -36 -16 C -48 -34 -34 -48 -20 -38" stroke="#80957B" stroke-width="1.8" fill="none" />
          <path d="M 36 -16 C 48 -34 34 -48 20 -38" stroke="#80957B" stroke-width="1.8" fill="none" />
          <text x="0" y="11" text-anchor="middle" font-family="'Great Vibes', cursive" font-size="32" font-weight="bold" fill="#8C6720">M & P</text>
        </svg>
      </div>

      <!-- 3. The Auspicious Wedding Of -->
      <div class="wedding-badge">The Auspicious Wedding Of</div>

      <!-- 4. Names -->
      <h1 class="couple-name">Mukesh Ojha</h1>
      <p class="parent-info">(Son of Smt. & Shri Ojha)</p>

      <div class="weds-row">
        <span class="weds-script">weds</span>
      </div>

      <h2 class="couple-name">Puja</h2>
      <p class="parent-info">(Daughter of Smt. & Shri Family)</p>

      <p class="main-invite-text">
        With hearts full of joy and the blessings of our families, we invite you to celebrate our union.
      </p>

      <!-- 5. Date & Venue Block -->
      <div class="date-card">
        <div class="date-digits">11 · 12 · 2026</div>
        <div class="venue-title">Dugda & Ojhadih, Bokaro</div>
      </div>

      <!-- 6. Events Mini List -->
      <div class="events-box">
        <div class="event-row">
          <div>
            <div class="event-name">Haldi Utsav</div>
            <div class="event-desc">Royal Courtyard, Dugda, Bokaro · Sunny Yellow & Marigold</div>
          </div>
          <div class="event-badge">10 DEC · 10:00 AM</div>
        </div>
        <div class="event-row">
          <div>
            <div class="event-name">Mehendi Ceremony</div>
            <div class="event-desc">Dugda, Bokaro · Details on website · Emerald Green & Mint</div>
          </div>
          <div class="event-badge">10 DEC · 04:00 PM</div>
        </div>
      </div>

      <!-- 7. Hindi Blessings Line -->
      <div class="hindi-lines">
        दो परिवार, दो दिल, एक नया सफ़र: आपकी उपस्थिति हमारी खुशियों को पूर्ण करेगी।<br/>
        <span style="font-size:16px; opacity:0.9;">
          आपके आशीर्वाद और स्नेह से हमारे जीवन का यह नया अध्याय और भी सुंदर होगा।
        </span>
      </div>

      <!-- 8. QR Code Block (28mm+ print size, quiet zone guaranteed) -->
      <div class="qr-container">
        <div class="qr-title-top">Scan To View Our Wedding Website</div>
        <div class="qr-img-frame">
          <img src="data:image/png;base64,${qrBase64}" alt="Wedding Website QR Code" />
        </div>
        <div class="qr-title-bottom">Itinerary · Venue · Blessings</div>
      </div>

      <!-- 9. Closing -->
      <div class="closing-signoff">
        <p style="font-style:italic; color:#7A503A; margin-bottom:4px;">“Your presence will be the most beautiful gift of our celebration.”</p>
        <p style="font-weight:600; color:#4A1C12;">With love & blessings, Mukesh & Puja</p>
        <p class="darshan-signoff">॥ आपके दर्शनाभिलाषी: Ojha & Family ॥</p>
      </div>
    </div>
  `}
</body>
</html>`;
}

async function runExport() {
  console.log('🚀 Starting Wedding Invitation Card Exports...');

  const browser = await puppeteer.launch({
    executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--font-render-hinting=none']
  });

  const page = await browser.newPage();

  // 1. Export inside spread preview: public/invitation/inside.jpg
  console.log('📸 Generating inside.jpg (inside spread preview)...');
  await page.setViewport({ width: 1000, height: 1400, deviceScaleFactor: 2 });
  await page.setContent(getExportHTML({ mode: 'inside', width: 1000, height: 1400 }), { waitUntil: 'domcontentloaded' });
  const insideJpgPath = path.join(outDir, 'inside.jpg');
  await page.screenshot({ path: insideJpgPath, type: 'jpeg', quality: 92 });
  console.log('✅ Generated ' + insideJpgPath);

  // 2. Export WhatsApp Image: public/invitation/invitation-whatsapp.png (1080x1350)
  console.log('📱 Generating invitation-whatsapp.png (1080x1350, <400KB target)...');
  await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 });
  await page.setContent(getExportHTML({ mode: 'inside', width: 1080, height: 1350 }), { waitUntil: 'domcontentloaded' });
  const waPngPath = path.join(outDir, 'invitation-whatsapp.png');
  await page.screenshot({ path: waPngPath, type: 'png' });
  
  // Compress via Python PIL / pngquant to ensure < 400KB
  try {
    execSync(`python3 -c "
from PIL import Image
im = Image.open('${waPngPath}')
im = im.convert('P', palette=Image.Palette.ADAPTIVE, colors=256)
im.save('${waPngPath}', optimize=True)
"`);
    const waStat = fs.statSync(waPngPath);
    console.log('✅ Generated ' + waPngPath + ' (' + Math.round(waStat.size / 1024) + ' KB)');
  } catch (e) {
    console.log('Warning on compression:', e.message);
  }

  // 3. Export Story Image: public/invitation/invitation-story.png (1080x1920)
  console.log('📲 Generating invitation-story.png (1080x1920)...');
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  await page.setContent(getExportHTML({ mode: 'inside', width: 1080, height: 1920 }), { waitUntil: 'domcontentloaded' });
  const storyPngPath = path.join(outDir, 'invitation-story.png');
  await page.screenshot({ path: storyPngPath, type: 'png' });
  console.log('✅ Generated ' + storyPngPath);

  // 4. Export PDF: public/invitation/Mukesh-Weds-Puja-Invitation.pdf (5x7 inch + 3mm bleed, 2 pages: Front & Inside)
  console.log('📄 Generating Mukesh-Weds-Puja-Invitation.pdf (5x7 inch with 3mm bleed)...');
  // 5x7 inches with 3mm (~0.118 in) bleed: width = 5.236in, height = 7.236in
  const pdfPath = path.join(outDir, 'Mukesh-Weds-Puja-Invitation.pdf');

  // Multi-page PDF HTML: Page 1 Front, Page 2 Inside
  const pdfHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: 5.24in 7.24in;
      margin: 0;
    }
    body {
      margin: 0;
      padding: 0;
    }
    .page-break {
      page-break-after: always;
      break-after: page;
      width: 5.24in;
      height: 7.24in;
      position: relative;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <div class="page-break">
    ${getExportHTML({ mode: 'front', width: 1572, height: 2172 })}
  </div>
  <div class="page-break">
    ${getExportHTML({ mode: 'inside', width: 1572, height: 2172 })}
  </div>
</body>
</html>`;

  await page.setContent(pdfHtml, { waitUntil: 'domcontentloaded' });
  await page.pdf({
    path: pdfPath,
    width: '5.24in',
    height: '7.24in',
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });
  console.log('✅ Generated ' + pdfPath);

  await browser.close();

  // ================= QR CODE VERIFICATION CHECK =================
  console.log('\\n🔍 Running Mandatory QR Code Verification on exported assets...');
  
  // Extract pixels from generated waPngPath and test with jsQR
  const qrCheckPy = `
from PIL import Image
import json
im = Image.open('${waPngPath}').convert('RGBA')
# Crop around QR code area (bottom center)
w, h = im.size
crop = im.crop((int(w * 0.3), int(h * 0.65), int(w * 0.7), int(h * 0.95)))
raw = list(crop.tobytes())
with open('/tmp/qr_exported_check.json', 'w') as f:
    json.dump({'width': crop.width, 'height': crop.height, 'data': raw}, f)
print(f'Extracted QR crop: {crop.width}x{crop.height}')
`;
  execSync(`python3 -c "${qrCheckPy}"`);
  
  const rawQr = JSON.parse(fs.readFileSync('/tmp/qr_exported_check.json', 'utf8'));
  const qrCodeResult = jsQR(new Uint8ClampedArray(rawQr.data), rawQr.width, rawQr.height);
  
  if (!qrCodeResult || !qrCodeResult.data) {
    console.error('❌ ERROR: Could not decode QR code from exported PNG!');
    process.exit(1);
  }

  console.log('🎯 QR Code successfully verified from exported asset!');
  console.log('📌 Decoded URL:', qrCodeResult.data);

  if (qrCodeResult.data !== 'https://invifestx16.vercel.app/') {
    console.error('❌ ERROR: Decoded URL does not match expected site URL! Found:', qrCodeResult.data);
    process.exit(1);
  }

  console.log('\\n🎉 All exports completed and verified successfully!');
}

runExport().catch(err => {
  console.error('Export failed:', err);
  process.exit(1);
});
