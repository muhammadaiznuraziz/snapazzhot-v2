# StyleGuide.md
# SnapAzzHot — Photobooth Redesign Style Guide

> **Purpose:** Redesign the SnapAzzHot visual experience without changing the existing user flow, feature logic, or application behavior.
>
> **Core rule:** **REDESIGN THE LOOK — DO NOT REDESIGN THE FLOW.**

---

# 01. DESIGN CONSTITUTION

SnapAzzHot harus terasa seperti photobooth modern yang menggabungkan:

- Premium SaaS
- Web3 visual language
- Editorial design
- Glassmorphism
- Neo Brutalism
- Swiss Grid
- Y2K / Gen Z playful energy
- Modern startup aesthetics

### Brand Personality

**Premium · Bold · Playful · Futuristic · Friendly · Creative · High Contrast**

Interface harus terlihat:

- mahal
- modern
- memorable
- fun
- polished
- tidak seperti template
- tidak seperti generic AI SaaS
- tidak seperti dashboard enterprise

### Golden Rule

> **Jangan ubah alur pengguna hanya karena desain baru terlihat lebih menarik.**

Visual boleh berubah secara signifikan.
Flow, state, feature, dan business logic tetap dipertahankan.

---

# 02. EXISTING USER FLOW

Flow aplikasi yang sudah ada **WAJIB dipertahankan**:

```text
LANDING
   ↓
THEME
   ↓
LAYOUT
   ↓
PERMISSION
   ↓
PREVIEW
   ↓
SESSION
   ↓
FILTER
   ↓
RESULT
```

### Flow Rules

Redesign tidak boleh:

- menghapus step
- menambahkan step baru tanpa kebutuhan
- mengubah urutan step
- mengubah behavior kamera
- mengubah proses capture
- mengubah proses filter
- mengubah proses result
- memaksa login jika sebelumnya guest diperbolehkan
- mengubah logic download/share

### Yang Boleh Diubah

- typography
- color
- spacing
- card
- button
- navigation
- background
- animation
- icon
- visual hierarchy
- illustration
- responsive layout
- micro interaction

---

# 03. DESIGN DIRECTION

## Visual Formula

```text
Premium
+
Playful
+
Futuristic
+
Editorial
+
Glass
+
Neon Accent
```

Jangan membuat desain terlalu serius.

Photobooth harus tetap terasa **fun**.

### Visual Keywords

```text
BIG TYPE
SOFT GLASS
ELECTRIC BLUE
NEON LIME
FLOATING OBJECTS
ROUND CARDS
EDITORIAL GRID
Y2K ENERGY
SUBTLE MOTION
```

---

# 04. COLOR SYSTEM

## Primary

| Token | Value | Usage |
|---|---|---|
| Primary | `#0038FF` | Main CTA, active state |
| Primary Hover | `#002ED6` | Hover |
| Primary Soft | `#E6ECFF` | Soft background |
| Accent | `#CCFF00` | Highlight |
| White | `#FFFFFF` | Main surface |
| Black | `#111111` | Main text |
| Gray 50 | `#F8F9FA` | Background |
| Gray 100 | `#F1F3F5` | Secondary surface |
| Gray 300 | `#DEE2E6` | Subtle border |
| Gray 500 | `#6C757D` | Secondary text |

## Color Roles

```text
BLUE
→ action
→ navigation
→ selected state
→ primary CTA

NEON GREEN
→ highlight
→ status
→ badge
→ playful accent

BLACK
→ authority
→ typography
→ strong contrast

WHITE
→ breathing room
→ card
→ content surface
```

### Color Rule

Gunakan neon green secara hemat.

Target visual balance:

```text
60% White / Gray
25% Blue
10% Black
5% Neon Green
```

Jangan menambahkan warna random.

---

# 05. TYPOGRAPHY

## Font

### Primary

```text
Satoshi
```

Fallback:

```text
Inter
```

### Display

```text
Clash Display
```

## Type Scale

| Level | Desktop | Weight | Line Height |
|---|---:|---:|---:|
| Display XL | 96px | 800 | 0.95 |
| Display L | 80px | 800 | 0.95 |
| H1 | 64px | 800 | 1.00 |
| H2 | 48px | 700 | 1.05 |
| H3 | 36px | 700 | 1.10 |
| H4 | 28px | 700 | 1.15 |
| Body Large | 20px | 400 | 1.50 |
| Body | 16px | 400 | 1.60 |
| Small | 14px | 500 | 1.50 |
| Caption | 12px | 600 | 1.40 |

## Typography Rules

Heading:

- bold
- oversized
- tight line-height
- short
- confident

Gunakan uppercase untuk:

- eyebrow
- badge
- metadata
- label
- beberapa CTA

Jangan membuat seluruh UI uppercase.

---

# 06. PHOTObooth TYPOGRAPHY STYLE

Karena SnapAzzHot adalah photobooth, typography boleh lebih playful daripada SaaS biasa.

### Hero Example

```text
READY
TO SNAP?

Capture your moment.
Make it yours.
```

### Button Example

```text
START SHOOT →
```

### Microcopy

Gunakan kalimat pendek.

Contoh:

```text
LOOKING GOOD.
```

```text
CHOOSE YOUR VIBE.
```

```text
GET CAMERA READY.
```

```text
ONE MORE?
```

```text
YOUR MOMENT IS READY.
```

Hindari copy panjang yang mengganggu pengalaman kamera.

---

# 07. GRID SYSTEM

## Desktop

```text
Container: 1280px
Maximum viewport: 1440px+
Columns: 12
Column gap: 32px
```

## Spacing System

Gunakan kelipatan 8px.

```text
4px
8px
16px
24px
32px
48px
64px
80px
120px
160px
```

## Mobile

```text
Horizontal padding: 20px
```

## Photobooth Principle

Konten utama harus selalu memiliki ruang bernapas.

Jangan membuat preview kamera terlalu penuh dengan UI.

---

# 08. BORDER RADIUS

| Element | Radius |
|---|---:|
| Card | 32px |
| Large Card | 40px |
| Button | 999px |
| Badge | 999px |
| Input | 20px |
| Modal | 32px |
| Image | 32px |
| Avatar | 50% |
| Camera Preview | 32px |

Semua elemen utama harus terasa soft dan rounded.

---

# 09. SHADOW

## Card

```css
box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
```

## Button

```css
box-shadow: 0 10px 20px rgba(0, 56, 255, 0.20);
```

## Glass

```css
box-shadow: 0 12px 30px rgba(255, 255, 255, 0.15);
```

Shadow harus:

- soft
- wide
- subtle

Jangan menggunakan hard black shadow.

---

# 10. GLASSMORPHISM

Glass digunakan sebagai accent visual.

```css
background: rgba(255, 255, 255, 0.20);
backdrop-filter: blur(20px);
border: 1px solid rgba(255, 255, 255, 0.35);
border-radius: 32px;
```

## Good Usage

Gunakan glass pada:

- floating controls
- navigation
- camera controls
- theme selector
- status indicator
- result actions
- decorative objects

## Bad Usage

Jangan membuat semua elemen glass.

Glass harus menciptakan depth.

---

# 11. BACKGROUND SYSTEM

Background tidak boleh flat dan mati.

Gunakan kombinasi:

```text
Grid
+
Subtle Noise
+
Soft Gradient
+
Floating Object
+
Large Empty Space
```

## Recommended Background

Base:

```text
#F8F9FA
```

dengan:

- subtle blue glow
- white glass shapes
- fine grid
- neon green micro accent

### Camera Screen

Untuk screen yang fokus pada kamera, background boleh lebih gelap agar kamera menjadi visual utama.

---

# 12. NAVIGATION

Navigation harus minimal.

Jika navigation diperlukan:

```text
Floating Pill
```

Contoh:

```text
┌────────────────────────────────────────┐
│ SnapAzzHot   Home   Gallery   ● Ready  │
└────────────────────────────────────────┘
```

Rules:

- rounded
- floating
- minimal
- sticky jika diperlukan
- tidak mengganggu kamera

---

# 13. BUTTON SYSTEM

## Primary

```text
Electric Blue
White text
Pill
Bold
```

Contoh:

```text
┌────────────────────────┐
│    START SHOOT →       │
└────────────────────────┘
```

## Secondary

White / transparent.

## Accent

Neon green.

## Button Size

```text
Height: 52–56px
Horizontal padding: 24–32px
Radius: 999px
Font weight: 700
```

## Button States

```text
Default
Hover
Active
Focus
Disabled
Loading
```

### Hover

```text
translateY(-2px)
```

Transition:

```text
0.4s ease
```

---

# 14. CARD SYSTEM

Cards harus terasa seperti floating objects.

## Standard Card

```text
Radius: 32px
Padding: 32px
Shadow: soft
```

## Selection Card

Untuk THEME dan LAYOUT:

```text
Default
→ White / Glass

Hover
→ Lift + blue accent

Selected
→ Electric Blue border/background

Disabled
→ Reduced opacity
```

Selection harus mudah dikenali bahkan tanpa animation.

---

# 15. THEME SELECTION

Step:

```text
LANDING
↓
THEME
```

Theme selector harus terasa seperti visual gallery.

### Card

```text
┌─────────────────────┐
│                     │
│      PREVIEW        │
│                     │
│                     │
├─────────────────────┤
│ Y2K                 │
│ Colorful · Retro    │
└─────────────────────┘
```

### Rules

- preview image lebih dominan
- label pendek
- selected state jelas
- hover lift
- jangan terlalu banyak teks

---

# 16. LAYOUT SELECTION

Layout harus menjadi **visual-first experience**.

Jangan menampilkan layout sebagai dropdown atau list biasa.

Gunakan:

```text
Visual Preview
+
Layout Name
+
Selection State
```

### Selection State

Selected:

```text
Electric Blue
+
Neon Green indicator
+
Subtle scale
```

---

# 17. PERMISSION SCREEN

Permission screen harus terasa friendly, bukan seperti browser error.

### Structure

```text
CAMERA READY?

We need access to your camera
to capture your moment.

[ ENABLE CAMERA ]
```

### Visual

Gunakan:

- camera icon
- glass card
- soft blue glow
- floating objects

### Error State

Jika camera tidak tersedia:

```text
CAMERA NOT AVAILABLE

You can still continue
by uploading a photo.

[ UPLOAD PHOTO ]
```

Jangan membuat error terlihat menakutkan.

---

# 18. PREVIEW SCREEN

Preview adalah visual bridge sebelum session.

Fokus:

```text
PHOTO
+
FRAME
+
LAYOUT
```

UI harus minimal.

### Priority

```text
1. Preview
2. Continue CTA
3. Small metadata
4. Decorative UI
```

Jangan membiarkan dekorasi menutupi preview.

---

# 19. SESSION SCREEN

SESSION adalah salah satu screen paling penting.

Kamera harus menjadi **primary visual**.

### Layout

```text
┌────────────────────────────────────────┐
│                                  ● REC │
│                                        │
│                                        │
│             CAMERA                     │
│                                        │
│                                        │
│                                        │
│          ┌────────────────┐            │
│          │      3         │            │
│          └────────────────┘            │
│                                        │
│        [ CAPTURE ]                     │
└────────────────────────────────────────┘
```

### Camera Rules

- camera preview besar
- controls minimal
- no unnecessary borders
- glass control panel
- clear countdown
- capture CTA dominant

---

# 20. COUNTDOWN

Countdown harus terasa premium.

### Style

Oversized number:

```text
3
```

```text
2
```

```text
1
```

Gunakan:

- scale animation
- fade
- subtle blur
- centered positioning

Duration:

```text
0.4–0.8s
```

Jangan menggunakan animation yang terlalu flashy.

---

# 21. FILTER SCREEN

Filter harus terasa visual.

Gunakan horizontal selector:

```text
Original
  ↓
Warm
  ↓
Cool
  ↓
Mono
  ↓
Retro
```

Preview harus update secara visual.

### Filter Card

- thumbnail
- filter name
- selected state

Selected:

```text
blue ring
+
small green indicator
```

---

# 22. RESULT SCREEN

Result adalah **reward moment**.

User baru saja menyelesaikan sesi.

Desain harus terasa celebratory tetapi tetap premium.

### Structure

```text
YOUR MOMENT
IS READY.

        ┌──────────────┐
        │              │
        │   PHOTO      │
        │              │
        └──────────────┘

[ DOWNLOAD ]
[ SHARE ]
[ RETAKE ]
```

### Priority

```text
1. Result image
2. Download
3. Share
4. Retake
```

### Optional

Tambahkan:

- QR
- package download
- social sharing
- print status

Tetap mengikuti feature yang sudah ada.

---

# 23. AVATAR / USER ELEMENT

Avatar:

```text
Circular
Soft shadow
Floating
```

Jangan gunakan square avatar.

---

# 24. ICON SYSTEM

Gunakan:

```text
Lucide Icons
```

Style:

```text
Outline
Rounded
2px stroke
```

Icon yang cocok:

```text
Camera
Image
Upload
Download
Share
RotateCcw
Sparkles
Check
X
ArrowRight
Settings
QrCode
```

Jangan mencampur icon library.

---

# 25. ILLUSTRATION STYLE

Jangan gunakan stock illustration.

Gunakan:

- floating glass object
- abstract camera
- 3D rounded shapes
- soft blue blobs
- neon rings
- hand-drawn arrows
- subtle grid
- Y2K inspired decorative objects

Decorations harus berada di belakang content.

---

# 26. MOTION SYSTEM

Gunakan Motion / Framer Motion.

## Duration

```text
Micro: 0.2s
Normal: 0.4s
Large: 0.6s
Hero: 0.8s
```

## Allowed

```text
Fade Up
Fade In
Scale
Float
Hover Lift
Parallax
Rotate
Magnetic
Card Tilt
```

## Page Transition

Gunakan:

```text
opacity
+
small translate
```

Jangan menggunakan page transition yang mengganggu proses photobooth.

---

# 27. MICRO INTERACTIONS

### Button

Hover:

```text
y: -2px
```

### Card

Hover:

```text
y: -6px
```

### Selected Card

```text
scale: 1.02
```

### Floating Object

```text
slow
infinite
easeInOut
```

### Principle

> Motion harus memberikan feedback, bukan sekadar hiasan.

---

# 28. RESPONSIVE

## Breakpoints

```text
Mobile: 390px
Tablet: 768px
Laptop: 1280px
Desktop: 1440px+
```

## Mobile

Semua grid menjadi stack.

```text
Desktop
3 columns

Mobile
1 column
```

### Mobile Rules

- no horizontal scrolling
- camera tetap menjadi fokus
- CTA mudah dijangkau
- controls tidak terlalu kecil
- typography scale down
- decorative elements dikurangi
- spacing dipadatkan

---

# 29. MOBILE SESSION

Mobile camera screen harus memprioritaskan kamera.

```text
┌────────────────────┐
│ ● READY            │
│                    │
│                    │
│      CAMERA        │
│                    │
│                    │
│                    │
│       3            │
│                    │
│   [ CAPTURE ]      │
└────────────────────┘
```

Controls tidak boleh menutupi wajah pengguna.

---

# 30. ACCESSIBILITY

Minimum requirement:

- high contrast
- visible focus state
- minimum touch target ±44px
- readable text
- clear selected state
- clear error state
- no color-only indication
- respect `prefers-reduced-motion`

---

# 31. DESIGN ANTI-PATTERNS

JANGAN:

- Bootstrap-looking UI
- Material UI-looking UI
- generic AI SaaS dashboard
- terlalu banyak gradient
- terlalu banyak glass
- terlalu banyak border
- sharp corners
- tiny typography
- random colors
- excessive animation
- stock illustration
- excessive shadows
- semua card berukuran sama
- semua section center aligned
- camera tertutup dekorasi

---

# 32. DO / DON'T

## DO

- oversized typography
- asymmetrical layout
- editorial composition
- floating objects
- rounded cards
- glassmorphism selektif
- electric blue
- neon green accent
- subtle grid
- soft shadow
- subtle motion
- visual-first theme selection
- visual-first layout selection
- camera sebagai primary visual

## DON'T

- ubah flow
- tambah step tanpa alasan
- ubah business logic
- mengubah feature behavior
- menggunakan random colors
- membuat UI terlalu kompleks
- membuat kamera menjadi secondary element

---

# 33. COMPONENT ARCHITECTURE

Gunakan sistem komponen konsisten.

```text
Design System
│
├── Foundations
│   ├── Colors
│   ├── Typography
│   ├── Spacing
│   ├── Radius
│   ├── Shadows
│   └── Motion
│
├── Components
│   ├── Button
│   ├── Card
│   ├── Badge
│   ├── Input
│   ├── Modal
│   ├── Navigation
│   ├── CameraControls
│   ├── Countdown
│   ├── FilterCard
│   └── LayoutCard
│
├── Photobooth Components
│   ├── ThemeSelector
│   ├── LayoutSelector
│   ├── CameraPreview
│   ├── CameraPermission
│   ├── SessionControls
│   ├── FilterSelector
│   ├── ResultPreview
│   └── ShareActions
│
└── Screens
    ├── Landing
    ├── Theme
    ├── Layout
    ├── Permission
    ├── Preview
    ├── Session
    ├── Filter
    └── Result
```

---

# 34. DESIGN TOKENS

```css
:root {
  /* COLORS */
  --color-primary: #0038FF;
  --color-primary-hover: #002ED6;
  --color-primary-soft: #E6ECFF;

  --color-accent: #CCFF00;

  --color-white: #FFFFFF;
  --color-black: #111111;

  --color-gray-50: #F8F9FA;
  --color-gray-100: #F1F3F5;
  --color-gray-300: #DEE2E6;
  --color-gray-500: #6C757D;

  /* RADIUS */
  --radius-card: 32px;
  --radius-large: 40px;
  --radius-input: 20px;
  --radius-pill: 999px;

  /* SPACING */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 16px;
  --space-4: 24px;
  --space-5: 32px;
  --space-6: 48px;
  --space-7: 64px;
  --space-8: 80px;
  --space-9: 120px;
  --space-10: 160px;

  /* SHADOW */
  --shadow-card: 0 20px 40px rgba(0, 0, 0, 0.15);
  --shadow-button: 0 10px 20px rgba(0, 56, 255, 0.20);
  --shadow-glass: 0 12px 30px rgba(255, 255, 255, 0.15);

  /* MOTION */
  --duration-fast: 0.2s;
  --duration-normal: 0.4s;
  --duration-slow: 0.6s;
  --duration-hero: 0.8s;
}
```

---

# 35. SCREEN-BY-SCREEN VISUAL PRIORITY

| Screen | Primary Focus | Secondary |
|---|---|---|
| Landing | Brand + CTA | Decorative visual |
| Theme | Theme preview | Theme name |
| Layout | Layout preview | Layout metadata |
| Permission | Camera permission | Alternative upload |
| Preview | Photo/frame preview | Continue |
| Session | Camera | Controls |
| Filter | Photo preview | Filter selector |
| Result | Final photo | Download/share |

### Rule

Setiap screen harus memiliki **satu visual primary focus**.

Jangan membuat semua elemen bersaing mendapatkan perhatian.

---

# 36. REDESIGN STRATEGY

Redesign dilakukan secara bertahap:

```text
STEP 01
Audit existing UI

↓

STEP 02
Apply design tokens

↓

STEP 03
Replace typography

↓

STEP 04
Replace color system

↓

STEP 05
Redesign components

↓

STEP 06
Redesign individual screens

↓

STEP 07
Add motion

↓

STEP 08
Responsive refinement

↓

STEP 09
Accessibility check

↓

STEP 10
Visual consistency audit
```

Tidak melakukan rewrite logic hanya untuk mendapatkan visual baru.

---

# 37. DEFINITION OF DONE

Sebuah screen dianggap selesai jika:

- [ ] Flow tetap sama
- [ ] Feature tetap sama
- [ ] Business logic tidak berubah
- [ ] Design token digunakan
- [ ] Typography sesuai
- [ ] Spacing mengikuti 8px system
- [ ] Radius konsisten
- [ ] Color konsisten
- [ ] Responsive
- [ ] Tidak overflow
- [ ] Accessible
- [ ] Motion subtle
- [ ] Camera tetap menjadi fokus pada SESSION
- [ ] Result terasa rewarding
- [ ] Tidak terlihat seperti template
- [ ] Konsisten dengan screen lainnya

---

# 38. FINAL DESIGN PRINCIPLE

> **SnapAzzHot bukan sekadar aplikasi kamera.**
>
> Experience harus terasa seperti masuk ke sebuah **digital photobooth universe**.

Visual harus:

```text
PREMIUM
+
PLAYFUL
+
FUTURISTIC
+
SOCIAL
+
MEMORABLE
```

Namun:

> **Flow tetap sama.**

> **Logic tetap sama.**

> **Feature tetap sama.**

Yang berubah adalah kualitas visual, hierarchy, interaction, motion, dan overall experience.

---

# 39. GOLDEN RULE

> **REDESIGN THE EXPERIENCE, NOT THE FLOW.**

> **Make every screen feel intentional.**

> **Make every component feel like it belongs to SnapAzzHot.**

> **Consistency > Creativity.**

> **Premium is not more decoration. Premium is better decisions.**
