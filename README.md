# PageOS

PageOS is a futuristic, sci-fi themed e-book reader and library management application built with Next.js. It features a terminal-inspired interface with a black background and monospaced fonts, designed to emulate a digital transmission or command-line experience.

## Core Features

- **Home Screen**: Displays trending books, recently added titles, and genre categories in a transmission card format with reading progress tracking.
- **Library Screen**: Personal book archive with list and grid view modes, sorting by title, author, or last accessed date.
- **Reader Screen**: Distraction-free reading experience with scroll, page, and auto-scroll modes, customizable fonts and themes.
- **Source Manager**: Integrates with Project Gutenberg, Standard Ebooks, and supports custom TXT/EPUB URLs with connection status monitoring.
- **Bookmark System**: Save and resume reading positions with memory pins.
- **Settings Panel**: BIOS-like configuration terminal for appearance, reading modes, and source management.
- **Profile/History**: Reading history, favorites, and optional Firebase sync across devices.

## Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **UI Components**: Radix UI, Tailwind CSS, Framer Motion
- **Backend**: Firebase for authentication and data sync
- **PDF Support**: PDF.js for document rendering
- **Styling**: Custom sci-fi theme with JetBrains Mono, Orbitron, and IBM Plex Mono fonts

## Getting Started

1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

- `src/app/`: Next.js app router pages and API routes
- `src/components/`: Reusable UI components and layouts
- `src/adapters/`: Data source integrations (Gutenberg, web search, etc.)
- `src/context/`: React context providers for state management
- `src/lib/`: Utility functions and Firebase configuration
- `src/services/`: User data and service integrations
