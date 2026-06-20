# 🚀 PAGE.OS: Where Literature Meets the Terminal

> *"In the beginning, there was the command line. And the command line was with Gutenberg, and the command line was Gutenberg."*
> — *The Book of Page, 1:1*

## 📜 Overview

PAGE.OS is a **knowledge discovery platform** wrapped in a dual-interface sci-fi terminal experience. Imagine booting up a vintage mainframe—one moment you're staring at a glowing command prompt, the next you're wandering through a digital lounge filled with literary treasures. Whether you prefer the stark beauty of a terminal screen or the cozy ambiance of a virtual library, PAGE.OS adapts to your mood while connecting you to vast archives of public domain literature and openly accessible web resources.

Core systems include:
- **Home Screen**: Displays trending books, recently added titles, and genre categories in a transmission card format with reading progress tracking.
- **Library Screen**: Personal book archive with list and grid view modes, sorting by title, author, or last accessed date.
- **Reader Screen**: Distraction-free reading experience with scroll, page, and auto-scroll modes, customizable fonts and themes.
- **Source Manager**: Integrates with Project Gutenberg and supports custom TXT/EPUB URLs with connection status monitoring.
- **Bookmark System**: Save and resume reading positions with memory pins.
- **Settings Panel**: BIOS-like configuration terminal for appearance, reading modes, and source management.
- **Profile/History**: Reading history, favorites, and optional Firebase sync across devices.

Forget sterile PDF viewers and boring library apps. PAGE.OS drops you into a universe where:
- Your bookshelf glows like a server rack in Classic Mode or warms like a reading nook in Lounge Mode
- Page turns feel like issuing terminal commands or gently flipping pages in a cherished volume  
- Discovering your next read is a treasure hunt through the digital ether, guided by intelligent recommendations

## 🌟 Key Features

### ⚡ **Dual-Mode Interface**
- **🖤 Classic Mode**: Step into the brig of a starship—pure terminal aesthetics with a black background, crisp green monospace text, and the subtle hum of a system ready for adventure. Ideal for those who love the raw, command-driven experience.
- **🛋️ Lounge Mode**: Relax in a virtual literary lounge—warmer tones, softer contrasts, and a comforting atmosphere that feels like your favorite reading chair, perfect for extended sessions without the terminal glare.

### 🔍 **Discovery & Access**
- Direct pipeline to **Project Gutenberg**—tap into tens of thousands of free ebooks from the public domain
- Ability to search and retrieve content from publicly available web archives and open texts
- Bring your own sources: Drop in TXT/EPUB files or point to any public web text
- Smart recommendations that actually *get* your taste (powered by Open Library and Gutendex popularity)

### 🔧 **Sysadmin-Level Controls**
- The **Settings Terminal** isn't just a menu—it's a full BIOS-esque configuration suite
- Tweak fonts, themes, reading modes, and source connections like you're overclocking a rig
- Toggle between scroll, page, and auto-scroll modes with the finesse of a UNIX wizard
- Customize your reading experience down to the kerning (because even in dystopian futures, typography matters)

### 🔖 **Never Lose Your Place**
- **Memory Pin** bookmarking system: Drop a marker and return exactly where you left off
- Reading progress tracked like mission elapsed time
- Optional Firebase sync to keep your library and progress alive across devices

### 📖 **Reader That Respects the Craft**
- Distraction-free interface that puts the text front and center
- Multiple rendered formats: scroll, paginated, and auto-scrolling (for when you want the book to read *to* you)
- Beautiful typography with sci-fi-approved fonts: JetBrains Mono, Orbitron, IBM Plex Mono
- PDF support via PDF.js for those weirdly formatted documents you can't avoid

## 🛠️ Under the Hood

### 🧱 Built With
- **Next.js 14** (App Router) — because even terminals need React
- **TypeScript** — for when you want your space station to not explode
- **Tailwind CSS** — styling that's as snappy as a command prompt
- **Radix UI** — accessible components that won't trigger your inner sysadmin's rage
- **Framer Motion** — animations smoother than a fresh kernel compile
- **Firebase** — optional cloud sync for your Literary Mainframe
- **PDF.js** — because sometimes you need to read a scanned manual from 1983

### 🔌 Architecture Highlights
- **Source Adapter Pattern**: Clean abstraction over Gutenberg, web search, and custom sources
- **Proxy API Routes**: Securely fetch content without exposing keys (like a proper bastion host)
- **React Context**: Global state (theme, auth, settings) managed without prop-drilling hell
- **Modular UI**: Swap between lounge and classic modes without missing a beat

## ▶️ Getting Your Hands on the Console

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- A terminal emulator (you're probably reading this in one)
- Optional: [Firebase](https://firebase.google.com/) account for cross-device sync

### Boot Sequence
```bash
# Clone the repository (or assimilate it into your collective)
git clone https://github.com/yourusername/PAGE.OS.git
cd PAGE.OS

# Install dependencies (engage the replicators)
npm install

# Configure Firebase (optional but recommended)
# Copy .env.example to .env and fill in your Firebase credentials
# Get them from: https://console.firebase.google.com/

# Start the development sequence
npm run dev

# Point your browser to http://localhost:3000
# Witness the boot animation... then immerse yourself in literature
```

### Production Deployment
```bash
# Build for production (initiate terraforming sequence)
npm run build

# Start the production server
npm run start

# Or deploy to Vercel/Netlify/etc. for instant interstellar availability
```

## 🎯 Why PAGE.OS?

Because discovering knowledge shouldn't feel like using software—it should feel like **booting into a cyberpunk library mainframe or stepping into a holographic reading lounge**, where every page turn is a command executed, every bookmark a saved state, and every completed journey a successful mission.

Whether you're:
- A retrocomputing enthusiast who dreams of reading *Neuromancer* on a VT100 terminal (Classic Mode)
- A literature lover wanting a cozy, distraction-free way to devour the classics (Lounge Mode)
- An explorer who enjoys switching between stark terminals and warm reading nooks depending on your mood
- Or just someone who thinks their discovery tool needs more blinking lights, monospace fonts, and ambient lighting options

...PAGE.OS is your portal to a more exciting way to seek, find, and immerse yourself in knowledge.

## 📜 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

## 👨‍🚀 Acknowledgments

- [**Project Gutenberg**](https://www.gutenberg.org/) for making literature free and accessible
- The open-source community for the amazing libraries that make this possible
- All the sci-fi writers who imagined terminals like this decades ago

---

*Made with ⌨️ and ☕ by travelers in the digital realms.*

*"The only way to discover the limits of the possible is to go beyond them into the impossible."*
— Arthur C. Clarke (probably would've used PAGE.OS)
