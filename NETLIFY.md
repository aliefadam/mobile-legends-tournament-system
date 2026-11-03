# Netlify deployment and local development

The site uses Netlify Functions for its API and Netlify Blobs for persistent data. The browser does not persist application data in localStorage or sessionStorage.

## Local development

1. Copy `.env.example` to `.env` and set a unique admin username, a password of at least 12 characters, and a random session secret of at least 32 characters.
2. Run `npm run dev`. This starts Netlify Dev, which serves the Vite app and `/api/*` functions together. Netlify Blobs uses its local development store; local changes are separate from the deployed site's data.
3. Open `http://localhost:8888`.

Do not commit `.env`. The first successful admin login initializes the Netlify Blobs admin record from `ADMIN_USERNAME` and `ADMIN_PASSWORD`. Afterward, the admin credentials can be changed in Settings.

## Deploy

Import the repository into Netlify. The checked-in `netlify.toml` configures the build, publish directory, Functions directory, and local development proxy. Add `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and `SESSION_SECRET` under **Site configuration → Environment variables**, then deploy.

For production, use a unique random `SESSION_SECRET` and a strong admin password. Keep these values private. Production Blobs are separate from the local development store.

## Existing browser data

Data previously saved in a browser's localStorage does not move to Netlify automatically. Before switching versions, download a JSON backup from the old app's **Admin → Settings → Backup Data** page. After deploying and logging in, use **Restore & Import** to put that backup into Netlify Blobs. The backup does not migrate the old simulated admin password; configure the new admin credentials through Netlify environment variables.

## Storage notes

Netlify Blobs stores each application collection as JSON. It is suitable for a small tournament system, but it does not provide relational queries or transactions across collections. Avoid simultaneous edits to the same collection from multiple admins. Keep regular backups, especially before restoring or resetting data.
