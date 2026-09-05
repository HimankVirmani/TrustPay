# Running TrustPay on your laptop

You need Node.js 18 or newer. Check with `node -v`; if it errors, install from nodejs.org.

Open a terminal **in this folder** (the one containing `package.json`) and run:

    npm install
    npm run dev

Then open http://localhost:3000 in your browser.

The first command takes about a minute and creates a `node_modules` folder.
You only need to run it once. After that, `npm run dev` alone is enough.

**Do not upload `node_modules` to GitHub.** It is thousands of files and Vercel
rebuilds it for you. The included `.gitignore` already excludes it.

## Viewing it properly

The app is built for phones. In Chrome press F12, then Ctrl+Shift+M to switch to
device view, and pick iPhone 14 Pro. The judge dashboard at `/dashboard` is the
one screen designed for a full desktop window.

## Optional: retrain the model

Everything on the insights and dashboard screens reads from
`public/ml/metrics.json`, which is already included. To regenerate it:

    pip install scikit-learn pandas numpy
    python3 ml/train.py

The numbers in the app change to match whatever the training run produces.

## If your changes don't appear

The service worker no longer registers in development, and it actively removes
any worker left over from an earlier session. If you ran an older build before,
do this once:

1. Stop the dev server.
2. Delete the `.next` folder.
3. Run `npm run dev` again.
4. In the browser press Ctrl+Shift+R (Cmd+Shift+R on Mac) to hard refresh.

If it still looks old, open DevTools → Application → Service Workers, click
Unregister, then Application → Storage → Clear site data.

On a phone, an installed PWA caches aggressively: remove it from your home
screen and reinstall it from the URL.
