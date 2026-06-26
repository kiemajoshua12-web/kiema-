# KIEMA Editing App — Product Requirements (PRD)

## Original Problem Statement
KIEMA Editing App is a cross-platform website built on AI-powered technology inspired by Adobe Firefly. Designed to run seamlessly on both PC and mobile devices, KIEMA delivers ultra-high 4K image quality and the highest video resolution. Users can describe creative ideas and instantly transform them into animated videos, motion graphics, and dynamic visual stories. Users can upload images to bring them to life — animate stills, add motion, and create up to 30-minute videos — all completely free.

## Architecture
- **Frontend**: React 19 + react-router-dom 7 + Tailwind + shadcn/ui (sonner toasts, select)
- **Backend**: FastAPI + Motor (MongoDB)
- **AI**: Gemini Nano Banana (`gemini-3.1-flash-image-preview`) for image gen, Sora 2 (`sora-2`) for video gen, via `emergentintegrations` + Universal EMERGENT_LLM_KEY
- **Auth**: Emergent-managed Google OAuth → backend session cookie (samesite=none, secure, httponly)
- **Storage**: Images saved as base64 data URLs in Mongo; videos saved as `.mp4` in `/app/backend/storage/videos`, served via `/api/media/video/{id}`

## User Personas
- **Hobbyist creator**: wants free, fast 4K image generation for posts/stories
- **Storyteller / indie filmmaker**: animates stills, prototypes scenes with text-to-video
- **Mobile-first creator**: uses KIEMA on phone, exports straight to social

## Core Requirements
1. Landing page with hero, features, how-it-works, pricing — all-free messaging
2. Google sign-in via Emergent OAuth
3. Studio workspace with three tools: Image / Animate / Video
4. Prompt input + style, aspect ratio, size, duration controls
5. Reference image upload for Animate flow
6. Real-time canvas preview + Download
7. Personal gallery with All/Images/Videos filters, detail modal, delete

## What's Been Implemented (2026-02-26)
- ✅ Backend: auth/session, auth/me, auth/logout, generate/image (Nano Banana), generate/video (Sora 2), generations list/delete, media/video serving
- ✅ Frontend: Landing (cinematic dark hero with bento features), Studio (3 tools, prompt bar, recent panel), Gallery (filters + detail modal), AuthCallback, ProtectedRoute
- ✅ Tested: 9/9 backend tests, 100% frontend critical-flow Playwright tests passed in iteration 1

## Prioritized Backlog
**P0 — done in v1**
- Image generation, text-to-video, image-to-video, gallery, auth

**P1 — next**
- Move image data to disk storage and serve via /api/media/image/{id} (DB bloat fix)
- Pagination / thumbnails for /api/generations
- Background queue + progress streaming for long video renders
- Share-public-link for gallery items (built-in shareability flywheel)

**P2 — later**
- True 30-min long-form video pipeline (chunked rendering + stitching)
- Multi-user collaborative editing (Yjs / Liveblocks)
- Style presets gallery curated by community
- Mobile PWA install banner
- In-product credit/upsell for premium speed lanes (revenue lever)

## Known Limitations
- Sora 2 currently supports 4/8/12s clips → "30-min video" is positioned as roadmap; UI exposes 4/8/12s only
- Image data URLs stored in Mongo — fine for MVP, plan disk storage migration once gallery scales

## Next Action Items
1. Disk-backed image storage migration
2. Public share links for generations
3. Long-form video stitching pipeline
