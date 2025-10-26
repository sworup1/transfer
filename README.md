# File Dropper

Simple file upload/download web app (no auth). Features:

- Upload multiple files (no UI limits). Files saved to `uploads/`.
- List files, select single/multiple, select all.
- Delete single or multiple selected files.
- Download single file directly; download multiple files as a zip.

## Run

1. Install dependencies:

   cd "e:\vacation ai\transfer"
   npm install

2. Start server:

   npm start

3. Open http://localhost:3000 in your browser.

Quick local hosting helper

I added two helper scripts you can run from this folder when you want the app to run in the background without logging in each time:

- `serve-local.ps1` — starts the server as a detached background process and writes the PID to `server.pid`. It also prints LAN-accessible URLs.
   Usage:
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\serve-local.ps1
   ```
   To attempt opening the firewall for port 3000 as part of starting (requires elevated PowerShell), run:
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\serve-local.ps1 -OpenFirewall
   ```

- `stop-server.ps1` — stops the server launched by `serve-local.ps1` (reads `server.pid`), or finds the node process running `server.js` and stops it.
   Usage:
   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\stop-server.ps1
   ```

Notes

- These scripts are for local use. They do not configure autostart. If you want autostart later I can set that up (Scheduled Task / Startup folder / service / Docker).
- If you plan to allow other devices on your LAN to connect, ensure the firewall rule is present (see `-OpenFirewall` option) or create it manually.


## Notes and limitations

- "No limit" on size or number is only practical insofar as your machine has disk space and Node/OS limits. This app stores files on disk in `uploads/`.
- For very large uploads, consider configuring a reverse proxy or chunked uploads.
- This app intentionally does not implement authentication; do not expose this to the public internet without adding appropriate protections.

