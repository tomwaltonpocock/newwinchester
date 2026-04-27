# Drop image files here

File naming:

    aspect-N-0.png    ← developer / current proposal (REQUIRED)
    aspect-N-1.png    ← AI alternative 1 (optional)
    aspect-N-2.png    ← AI alternative 2 (optional)
    aspect-N-3.png    ← AI alternative 3 (optional)

Replace `N` with the aspect number (1, 2, 3, …). You can have up to 3 alternatives per aspect; the UI adapts to however many you provide.

Accepted formats: `.png` (recommended), `.jpg`, `.jpeg`, `.webp`, `.svg`.
Aim for ≤ 300 KB per file at ~1600 px on the long edge, EXIF stripped.
4:3 aspect ratio renders best (the chooser uses `object-cover`).

The placeholder `aspect-1-0.svg` … `aspect-3-2.svg` files are dummies; drop your real PNGs with the same names and they'll override.

The build picks up new files automatically on `npm run dev`, `npm run build`, and `npm run start`. Run manually with `npm run aspects`.

Optional titles, questions and "what to notice" bullets live in `src/content/aspects.ts`.
