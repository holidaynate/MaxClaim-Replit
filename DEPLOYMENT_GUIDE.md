# Max-Claim Deployment Guide
**From Replit to Production** | December 2025

## 🎯 Current Stack (What You Actually Built)
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Express + Node.js
- **Database**: PostgreSQL (Neon/Replit-hosted)
- **Features**: OCR, PDF export, partnership system, pricing analytics

---

## ✅ Recommended Deployment: Replit Deployments

Your app is **already on the best platform** for your stack. Here's why:

### Why Stay on Replit:
1. ✅ **PostgreSQL included** - No migration needed
2. ✅ **Zero configuration** - Already working
3. ✅ **Custom domain ready** - max-claim.com waiting
4. ✅ **Automatic scaling** - Handles traffic spikes
5. ✅ **Built-in monitoring** - Logs and analytics
6. ✅ **Environment secrets** - Secure key management
7. ✅ **Cost-effective** - $20/month for production

### Deployment Steps:

#### 1. Click "Deploy" in Replit
- Go to your Replit project
- Click the "Deploy" button in top-right
- Choose "Autoscale Deployment" ($20/month)

#### 2. Connect Custom Domain
```
Domain: max-claim.com (GoDaddy)
→ Replit Deployments Settings
→ Add Custom Domain
→ Update GoDaddy DNS to point to Replit
```

**GoDaddy DNS Settings:**
```
Type: CNAME
Host: @
Points to: [your-replit-deployment].replit.app
TTL: 600
```

#### 3. Environment Variables (Already Set)
Your secrets are already configured:
- ✅ `DATABASE_URL` - PostgreSQL connection
- ✅ `SESSION_SECRET` - Express sessions
- ✅ `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`

#### 4. Production Database
Your Replit PostgreSQL is production-ready:
- Neon-backed (99.95% uptime SLA)
- Automatic backups
- Rollback capability
- 3GB storage included

---

## 🔄 Alternative: Azure Deployment (If You Prefer Microsoft)

**Only if you need Azure features** (e.g., enterprise compliance, Active Directory integration)

### Azure Architecture:
```
┌──────────────────────────────────────┐
│  GitHub: holidaynate/maxclaim        │
└────────────┬─────────────────────────┘
             │ (GitHub Actions CI/CD)
             ▼
┌──────────────────────────────────────┐
│  Azure App Service                   │
│  - Node.js runtime                   │
│  - Express backend                   │
│  - React build served                │
└────────────┬─────────────────────────┘
             │
             ▼
┌──────────────────────────────────────┐
│  Azure Database for PostgreSQL       │
│  - Flexible Server                   │
│  - 2 vCores, 8GB RAM                 │
└──────────────────────────────────────┘
```

### Azure Services Needed:
- **App Service**: $55-75/month (B2 tier)
- **PostgreSQL Flexible Server**: $80-100/month (B2ms)
- **Blob Storage**: $5/month (document uploads)
- **Application Insights**: $0-10/month (monitoring)
- **Total**: ~$140-185/month

### Azure Deployment Steps:

1. **Export Database from Replit**
```bash
# In Replit Shell
pg_dump $DATABASE_URL > maxclaim_backup.sql
```

2. **Create Azure Resources**
```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login
az login

# Create resource group
az group create --name maxclaim-rg --location eastus

# Create PostgreSQL
az postgres flexible-server create \
  --name maxclaim-db \
  --resource-group maxclaim-rg \
  --location eastus \
  --admin-user maxclaimadmin \
  --admin-password [STRONG_PASSWORD] \
  --sku-name Standard_B2ms \
  --tier Burstable \
  --version 14

# Create App Service
az webapp create \
  --name maxclaim-app \
  --resource-group maxclaim-rg \
  --plan maxclaim-plan \
  --runtime "NODE:18-lts"
```

3. **Import Database**
```bash
# Restore to Azure PostgreSQL
psql "host=maxclaim-db.postgres.database.azure.com \
      port=5432 \
      dbname=postgres \
      user=maxclaimadmin \
      sslmode=require" < maxclaim_backup.sql
```

4. **Configure GitHub Actions** (in your repo)
```yaml
# .github/workflows/azure-deploy.yml
name: Deploy to Azure
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build frontend
        run: npm run build
      
      - name: Deploy to Azure
        uses: azure/webapps-deploy@v2
        with:
          app-name: maxclaim-app
          publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
```

5. **Set Environment Variables in Azure**
```bash
az webapp config appsettings set \
  --resource-group maxclaim-rg \
  --name maxclaim-app \
  --settings \
    DATABASE_URL="postgresql://..." \
    SESSION_SECRET="..." \
    NODE_ENV="production"
```

---

## 📊 Cost Comparison

| Platform | Monthly Cost | Setup Time | Migration Effort |
|----------|-------------|------------|------------------|
| **Replit** (Current) | **$20** | ✅ **0 min** (Already done) | ✅ **None** |
| Azure | $140-185 | 2-3 hours | Database export/import |
| GCP | $100-150 | 2-3 hours | Database export/import |
| AWS | $120-160 | 3-4 hours | Database export/import |

---

## 🎯 My Recommendation: **Stay on Replit**

**Why?**
1. ✅ **Already production-ready** - App works perfectly
2. ✅ **7x cheaper** than Azure ($20 vs $140/month)
3. ✅ **Zero migration risk** - No database export/import
4. ✅ **Faster time to market** - Deploy in 5 minutes
5. ✅ **PostgreSQL included** - No separate database management
6. ✅ **Automatic scaling** - Handles traffic growth
7. ✅ **Custom domain ready** - max-claim.com works out of box

**When to Consider Azure:**
- You need enterprise Active Directory integration
- You require Azure-specific compliance certifications
- You're already heavily invested in Microsoft ecosystem
- You need Azure Cosmos DB globally distributed features

---

## 🚀 Next Steps (Recommended Path)

### Week 1: Deploy on Replit Production
1. ✅ Click "Deploy" button in Replit (5 min)
2. ✅ Connect max-claim.com domain (15 min)
3. ✅ Test production deployment (30 min)
4. ✅ Set up monitoring/alerts (30 min)

### Week 2: Launch & Marketing
1. Submit to Google/Microsoft app stores (if building mobile)
2. Start contractor acquisition via PartnerSection
3. Monitor analytics and user feedback
4. Iterate based on real usage

### Later: Scale If Needed
- If you exceed Replit's limits (>1M requests/month)
- Then consider Azure/GCP/AWS migration
- By then, you'll have revenue to justify costs

---

## 🔐 Security Checklist (Already Done ✅)

- ✅ **Environment secrets** managed by Replit
- ✅ **PostgreSQL** behind firewall
- ✅ **HTTPS/SSL** automatic on Replit deployments
- ✅ **Session secrets** stored securely
- ✅ **No PII collection** (privacy-first architecture)
- ✅ **Input validation** with Zod schemas
- ✅ **SQL injection protection** via Drizzle ORM

---

## 📈 Monitoring & Analytics

**Built-in Replit Tools:**
- Workflow logs (server errors, requests)
- Browser console logs (frontend errors)
- Database queries (via Replit DB panel)

**Add These (Optional):**
- Google Analytics 4 - User behavior tracking
- Sentry - Error monitoring ($0-26/month)
- LogRocket - Session replay ($99/month if needed)

---

## 📞 Support Resources

**Replit Deployments:**
- Docs: https://docs.replit.com/deployments
- Discord: https://replit.com/discord
- Email: support@replit.com

**Max-Claim Issues:**
- GitHub: https://github.com/holidaynate/maxclaim-rec-suite-site
- Domain: max-claim.com DNS settings in GoDaddy

---

## 🎉 Bottom Line

Your app is **production-ready right now**. Click "Deploy" in Replit, connect your domain, and you're live. Save $120/month vs Azure and focus on user acquisition instead of infrastructure migration.

**Azure is great, but unnecessary for your current needs.** Start on Replit, prove the business model, then migrate to Azure if you need enterprise features later.
