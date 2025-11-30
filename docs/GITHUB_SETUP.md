# GitHub Repository Setup Guide

## 📦 What Gets Pushed to GitHub

Your repository will contain:
- ✅ `frontend/` - Next.js application
- ✅ `backend/` - Express API
- ✅ `docs/` - All documentation
- ✅ `README.md` - Project overview
- ✅ `.gitignore` - Ignore rules
- ❌ `.env` - NEVER pushed (contains secrets)
- ❌ `node_modules/` - NEVER pushed (too large)
- ❌ `database/` - NEVER pushed (use backend/database instead)
- ❌ Build outputs (`.next/`, `dist/`)

---

## 🚀 Quick Setup

### 1. Initialize Git Repository

```bash
cd c:\Users\sadil\Desktop\acad

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Islamic Academy Platform"
```

### 2. Create GitHub Repository

1. Go to [github.com/new](https://github.com/new)
2. Repository name: `islamic-academy` (or your choice)
3. Description: `Islamic Academy - Meeting booking platform with teacher scheduling`
4. Visibility: **Private** (recommended for production apps)
5. **Do NOT** initialize with README (you already have one)
6. Click "Create repository"

### 3. Push to GitHub

```bash
# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/islamic-academy.git

# Push to main branch
git branch -M main
git push -u origin main
```

---

## 📁 Repository Structure on GitHub

```
islamic-academy/
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── .env.example          # Template (safe to push)
│   ├── .vercelignore
│   └── vercel.json
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── config/
│   ├── database/
│   │   ├── schema.sql
│   │   └── migrations/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example          # Template (safe to push)
│   ├── .vercelignore
│   ├── vercel.json
│   └── railway.json
│
├── docs/
│   ├── DEPLOYMENT_READY.md
│   ├── QUICK_DEPLOY.md
│   ├── RAILWAY_DEPLOYMENT.md
│   ├── VERCEL_DEPLOYMENT.md
│   ├── PROJECT_STRUCTURE.md
│   ├── api/
│   ├── features/
│   └── fixes/
│
├── .gitignore
└── README.md
```

---

## 🔒 Security: What NEVER Gets Pushed

The `.gitignore` file ensures these are NEVER pushed:

```
❌ .env                    # Contains ALL your secrets
❌ node_modules/           # Dependencies (too large)
❌ .next/                  # Build output
❌ dist/                   # Compiled code
❌ database/               # Root database folder
❌ *.log                   # Log files
❌ littlemuslima-*.json    # Google credentials
```

---

## ✅ What IS Safe to Push

```
✅ .env.example            # Template with no real values
✅ package.json            # Dependencies list
✅ tsconfig.json           # TypeScript config
✅ vercel.json            # Deployment config
✅ railway.json           # Deployment config
✅ All source code        # Your application code
✅ Documentation          # All .md files
```

---

## 🔄 Daily Workflow

### Making Changes

```bash
# Check what changed
git status

# Add specific files
git add frontend/app/student/page.tsx
git add backend/src/services/meetingService.ts

# Or add all changes
git add .

# Commit with descriptive message
git commit -m "Fix: Teacher resources now display in student portal"

# Push to GitHub
git push
```

### Viewing History

```bash
# See commit history
git log --oneline

# See what changed in a commit
git show <commit-hash>

# See current changes
git diff
```

---

## 🌿 Branching Strategy (Recommended)

### For Development

```bash
# Create development branch
git checkout -b dev

# Make changes, commit
git add .
git commit -m "Add new feature"

# Push dev branch
git push -u origin dev

# When ready, merge to main
git checkout main
git merge dev
git push
```

### For Features

```bash
# Create feature branch
git checkout -b feature/teacher-resources

# Work on feature
git add .
git commit -m "Add resource management for teachers"

# Push feature branch
git push -u origin feature/teacher-resources

# Create Pull Request on GitHub
# After review, merge to main
```

---

## 🚀 Deploy from GitHub

### Vercel Deployment

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Import Git Repository"
3. Select your `islamic-academy` repository
4. Configure:
   - **For Frontend**: Root Directory = `frontend`
   - **For Backend**: Root Directory = `backend`
5. Add environment variables
6. Deploy!

### Railway Deployment

1. Go to [railway.app/new](https://railway.app/new)
2. Click "Deploy from GitHub repo"
3. Select your repository
4. Set Root Directory = `backend`
5. Add environment variables
6. Deploy!

**Both will auto-deploy when you push to `main` branch!**

---

## 🔐 Managing Secrets

### Never Commit Secrets!

If you accidentally committed `.env`:

```bash
# Remove from git history (DANGEROUS!)
git rm --cached .env
git commit -m "Remove .env from tracking"
git push

# Regenerate ALL secrets!
# - Get new Clerk keys
# - Get new Stripe keys
# - Update in deployment platforms
```

### Environment Variables Setup

**Local Development:**
- Use `.env` file (not pushed to GitHub)

**Production (Vercel/Railway):**
- Add environment variables in dashboard
- Never paste secrets in code

---

## 📊 GitHub Best Practices

### Commit Messages

Good:
```
✅ Fix: Resolve CORS error for production frontend
✅ Feature: Add teacher resource management
✅ Update: Optimize database queries for performance
✅ Docs: Add deployment guide for Railway
```

Bad:
```
❌ fixed stuff
❌ changes
❌ Update
```

### When to Commit

- ✅ After completing a feature
- ✅ After fixing a bug
- ✅ Before switching tasks
- ✅ At end of work session
- ❌ Don't commit broken code
- ❌ Don't commit sensitive data

---

## 🔍 Verify Before Pushing

Always check:

```bash
# 1. What will be pushed?
git status

# 2. Review changes
git diff

# 3. Make sure .env is NOT included
git status | grep .env
# Should return nothing!

# 4. Test locally
cd backend && npm run build
cd ../frontend && npm run build

# 5. If all good, push
git push
```

---

## 🆘 Common Issues

### Already pushed .env by mistake?

```bash
# Remove from future commits
git rm --cached .env
git commit -m "Remove .env from tracking"
git push

# Then REGENERATE all secrets immediately!
```

### Large files rejected?

```bash
# GitHub has 100MB file limit
# Check file sizes
git ls-files -s | sort -n -k 2

# Remove large files
git rm --cached path/to/large-file
```

### Merge conflicts?

```bash
# Pull latest changes
git pull

# Fix conflicts in your editor
# Look for <<<<<<< HEAD markers

# After fixing
git add .
git commit -m "Resolve merge conflicts"
git push
```

---

## 📝 Quick Reference

| Command | Description |
|---------|-------------|
| `git status` | See what changed |
| `git add .` | Stage all changes |
| `git commit -m "message"` | Commit with message |
| `git push` | Push to GitHub |
| `git pull` | Get latest from GitHub |
| `git log` | View commit history |
| `git branch` | List branches |
| `git checkout -b name` | Create new branch |
| `git merge branch` | Merge branch |

---

## ✨ Next Steps

1. **Initialize Git** (if not done)
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Create GitHub Repository**
   - Go to github.com/new
   - Create private repository

3. **Push Code**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/islamic-academy.git
   git push -u origin main
   ```

4. **Deploy**
   - Frontend → Vercel (connect GitHub repo)
   - Backend → Railway (connect GitHub repo)

5. **Auto-Deploy Enabled!**
   - Every push to `main` → Automatic deployment
   - Every PR → Preview deployment

---

**Your code is ready to push!** 🚀

The `.gitignore` is properly configured to protect your secrets.
