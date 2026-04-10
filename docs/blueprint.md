# **App Name**: PageOS

## Core Features:

- Home Screen: Black background with white monospaced text. Sections: Trending Books, Recently Added, Genres. Book entries displayed as grayscale transmission cards styled like terminal logs. Each card shows: Title, Author, Source, Reading Progress. Top bar includes a command-style Search input (filters by title, author, or source).
- Library Screen: Personal archive display of saved or in-progress books. Toggle between list mode (directory-like) and grid mode (visual archive). Each item shows: reading progress, last accessed chapter, and metadata. Sort options: Title, Author, Last Accessed. Interactions simulate a file explorer or command list.
- Reader Screen: Fullscreen, distraction-free transmission reader. Modes: Scroll Mode (vertical), Page Mode (horizontal), Auto-scroll (optional). Top info bar styled as transmission metadata. Progress bar styled as decoding progress. Optional floating footer line: Memory Stream Active...
- Reader Customization: BIOS-like terminal overlay settings panel. Adjust: Font size, font style (sci-fi / monospaced), line height, margin spacing. Themes: VOID.BLACK (black bg, white text), PAPER.WHITE (white bg, black text). Styled toggle controls that resemble command switches.
- Bookmark System: Save current position as a memory pin. Resume exactly from last read location. Bookmarks styled as glowing pulse marks or silent command logs.
- Chapter Navigation: Sidebar or dropdown with chapter list, presented as an index log. Shows read/unread state with symbols: ✓ for read, • for unread. Chapter transitions include terminal-like loader.
- Source Manager: Built-in sources: Project Gutenberg, Standard Ebooks, Custom source via TXT/EPUB URL. Toggle each source on/off. Show connection status: Online, Offline, Error. Refresh button = command-style input. Add Source = user enters URL into terminal-style prompt.
- Settings Panel: Full visual config terminal. Includes: Appearance settings, Reading mode toggles (scroll, paged, auto), Source manager access, Progress reset, Offline cache toggle. Styled as a clean bordered overlay with cursor glints and glitch-hover
- Profile / History: Access reading history and list of favorited books. Export bookmarks and completed titles list. Optional Firebase login to sync across devices (web + Android)

## Style Guidelines:

- Background: #000000
- Primary Text: #FFFFFF
- Accent (cursor/hover/blink): #00FFD0 or #00FF66
- UI: JetBrains Mono, Orbitron, IBM Plex Mono
- Reader: Literata or Space Grotesk
- Avoid icons unless stylized as terminal glyphs (e.g., ▸, ▍, ✓)
- Components: Clean bordered boxes, hover glows
- Transitions: Glitch flicker, Fade-in, Page wave distortion, Cursor blink (▍) on idle