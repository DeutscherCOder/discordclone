# Moonlit Discord Clone

A dark, night-themed Discord-style interface with a custom egg mark. This first slice is a dependency-free web interface prototype designed to be wired to Cloudflare Workers, D1, Durable Objects, R2, and Realtime.

## Run locally

Because this is a static interface, any static server works:

```bash
npm run dev
```

Then open `http://localhost:4173`.

## Current interface slice

- Responsive server rail, channel navigation, member list, and chat layout
- Dark night palette with white text and custom inline egg icon
- Interactive channel switching and message composer
- Local file selection with attachment preview
- Browser-native screen sharing preview via `getDisplayMedia()`
- Voice-room dock UI and join/leave state
- Mobile navigation and member drawer

## Next wiring phase

The interface is intentionally dependency-free so it can be deployed cheaply as static assets. The next phase will replace local interactions with Cloudflare services:

- Workers for API/auth
- D1 for relational metadata and messages
- Durable Objects for presence, WebSockets, and signaling
- R2 for direct-to-storage attachments
- Cloudflare Realtime for group voice and screen-share media
