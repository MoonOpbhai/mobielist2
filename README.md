# Movie List — Supabase + Render

Same UI style, Supabase backend, Render deploy, public add/edit/delete, automatic numbering.

## 1. Supabase setup

1. Create a Supabase project.
2. Open SQL Editor.
3. Run `supabase/schema.sql`.
4. Go to Project Settings > API.
5. Copy:
   - Project URL
   - anon public key

## 2. Local test

Edit `public/config.js`:

```js
window.APP_CONFIG = {
  SUPABASE_URL: 'https://YOUR_PROJECT.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR_ANON_KEY'
};
```

Then open `public/index.html` in browser.

## 3. Render deploy

1. Push this folder to GitHub.
2. Render > New > Static Site.
3. Build command: `npm run build`
4. Publish directory: `public`
5. Add environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
6. Deploy.

## Notes

- Public CRUD means every visitor can add, edit, and delete rows.
- For a safer version, add login or a secret edit PIN.
- Use only links you own or have permission to share.
