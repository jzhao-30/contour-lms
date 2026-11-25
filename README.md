# Contour Mini LMS

A small consultation-booking app built for the Contour Software Engineer technical assessment.

Please refer to the **run guide submitted with the assessment** for setup instructions, demo accounts and the live deployment link.

## Quick start

Requires Docker Desktop (running) and Node 20+.

```bash
git clone https://github.com/jzhao-30/contour-lms.git
cd contour-lms
./bootstrap/bootstrap.sh
```

Then open http://localhost:3000.

## Repository layout

| Folder | Contents |
| --- | --- |
| `bootstrap/` | Local start script |
| `contour-lms/` | The Next.js + Supabase app (see `contour-lms/README.md` for details) |
| `document/` | API spec and diagrams |
