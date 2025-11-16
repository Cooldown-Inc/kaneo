# Heroku Deployment Guide

## Prerequisites

1. Heroku CLI installed
2. Heroku account
3. PostgreSQL add-on (Heroku Postgres)

## Setup Steps

### 1. Create Heroku App

```bash
heroku create your-app-name
```

### 2. Add PostgreSQL Add-on

```bash
heroku addons:create heroku-postgresql:mini
```

This automatically sets the `DATABASE_URL` environment variable.

### 3. Enable Corepack for pnpm

Heroku needs corepack enabled to use pnpm:

```bash
heroku config:set ENABLE_COREPACK=1
```

### 4. Set Environment Variables

Set all required environment variables:

```bash
heroku config:set NODE_ENV=production
heroku config:set KANEO_API_URL=https://your-app-name.herokuapp.com
heroku config:set KANEO_CLIENT_URL=https://your-frontend-domain.com
heroku config:set AUTH_SECRET=your-secret-key-here
heroku config:set CORS_ORIGINS=https://your-frontend-domain.com
```

Optional variables:
```bash
heroku config:set GITHUB_CLIENT_ID=your-github-client-id
heroku config:set GITHUB_CLIENT_SECRET=your-github-client-secret
heroku config:set GITHUB_APP_ID=your-github-app-id
heroku config:set GITHUB_PRIVATE_KEY=your-github-private-key
heroku config:set GITHUB_WEBHOOK_SECRET=your-webhook-secret
heroku config:set GITHUB_APP_NAME=your-app-name
```

### 5. Commit Your Changes

**Important**: Make sure all changes are committed before deploying:

```bash
git add .
git commit -m "Prepare for Heroku deployment"
```

### 6. Deploy

**Deploy from repository root (required for monorepo)**

Deploy from the repository root. The Procfile uses `pnpm --filter` to target the API package:

1. Copy the Procfile to the root directory:
   ```bash
   cp apps/api/Procfile ./Procfile
   ```

2. Deploy:
   ```bash
   git push heroku main
   ```

Heroku will:
1. Detect the `Procfile` at the root
2. Run `pnpm install` at the root (installs workspace dependencies)
3. Run `heroku-postbuild` script (builds the API via `pnpm --filter @kaneo/api build`)
4. Run the `release` command (runs migrations)
5. Start the `web` process

**Note**: If deploying from `apps/api` subdirectory, you'll need to:
1. Copy root `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` to `apps/api/`
2. Copy `packages/email` directory
3. Update Procfile to use relative paths

### 7. Verify Deployment

```bash
heroku logs --tail
heroku open
```

Visit `https://your-app-name.herokuapp.com/api/health` to verify it's running.

## Important Notes

### Monorepo Structure

Since this is a monorepo with workspace dependencies (`@kaneo/email`), you need to ensure:

1. **Deploy from root**: The entire monorepo structure must be available for `pnpm` to resolve workspace dependencies
2. **Build process**: The build script uses `esbuild` with `--packages=external`, which means workspace packages need to be available at runtime OR bundled into the dist folder
3. **Workspace packages**: The `@kaneo/email` package must be accessible. If esbuild doesn't bundle it, ensure `packages/email` is included in the deployment

### Database Migrations

Migrations run automatically via the `release` command in the Procfile before each deployment. If migrations fail, the deployment will be rolled back.

### Port Configuration

The app automatically uses `process.env.PORT` (set by Heroku) or defaults to 1337 for local development.

### Build Output

The build outputs to `apps/api/dist/` and includes:
- Bundled JavaScript files
- Source maps (for debugging)
- Database migrations (`drizzle/` folder)

## Troubleshooting

### Workspace Dependency Issues

If you see errors about `@kaneo/email` not being found:

1. Ensure you're deploying from the repository root
2. Check that `packages/email` is included in the deployment
3. Verify `pnpm-workspace.yaml` is present at the root

### Build Failures

Check build logs:
```bash
heroku logs --tail
```

Common issues:
- Missing environment variables
- Database connection issues
- Build script failures

### Database Connection

Verify `DATABASE_URL` is set:
```bash
heroku config:get DATABASE_URL
```

The connection string should be in the format:
```
postgres://user:password@host:port/database
```

