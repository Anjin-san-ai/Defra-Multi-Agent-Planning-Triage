# Defra Multi-Agent Planning Triage System

GDS-compliant dashboard demonstrating multi-agent AI for EA & Natural England planning consultation triage.

## Prerequisites

You need **Node.js** installed (version 18 or higher).

Check if you have it:
```
node --version
```

If not installed, download from: https://nodejs.org/

## Quick Start

### 1. Open the project folder in VS Code

```
File → Open Folder → select the "defra-project" folder
```

### 2. Open a terminal in VS Code

```
Terminal → New Terminal  (or press Ctrl + `)
```

### 3. Install dependencies

```
npm install
```

### 4. Start the dev server

```
npm run dev
```

### 5. Open in browser

The terminal will show something like:

```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
```

It should open automatically. If not, hold **Ctrl** and click the URL, or paste `http://localhost:3000` into your browser.

## That's it!

The dashboard will be running with hot reload — any edits you make to files in `src/` will update the browser instantly.

To stop the server, press **Ctrl + C** in the terminal.

## Project Structure

```
defra-project/
├── index.html                              ← HTML entry point
├── package.json                            ← Dependencies and scripts
├── vite.config.js                          ← Vite dev server config
├── staticwebapp.config.json                ← Azure SWA routing config
├── .github/workflows/                      ← CI/CD: deploys to Azure SWA on push to main
│   └── azure-static-web-apps.yml
├── README.md                               ← This file
└── src/
    ├── main.jsx                            ← React bootstrap
    └── App.jsx                             ← The entire dashboard application
```

## Deploying to Azure Static Web Apps

This repo is set up to deploy automatically to Azure Static Web Apps on every push to `main`.

### One-time Azure setup

1. In the Azure Portal, create a **Static Web App** resource and link it to this GitHub repo + the `main` branch.
2. Set build settings:
   - **App location:** `/`
   - **API location:** *(leave empty)*
   - **Output location:** `dist`
3. Azure will create a deployment token and add it to the repo as the `AZURE_STATIC_WEB_APPS_API_TOKEN` secret automatically. If you create the SWA via CLI, add the secret manually under **Settings → Secrets and variables → Actions**.

### How it builds

The GitHub Actions workflow runs `npm install` and `vite build` (output → `dist/`), then uploads the build to Azure SWA. SPA fallback routing is handled by `staticwebapp.config.json`.
