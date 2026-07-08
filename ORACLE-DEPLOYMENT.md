# SubTrack AI — Oracle Cloud Deployment Guide
## Domain: subtrack.scanmymenu.in | Server: 1GB RAM, 42GB disk

## Prerequisites on your Oracle Cloud server

### Step 1: Connect to your server
```bash
ssh ubuntu@your-server-ip
```

### Step 2: Install Node.js + Bun + Git
```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Bun (faster than npm)
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc

# Install Git
sudo apt-get install -y git

# Install PM2 (process manager — keeps the app running)
sudo npm install -g pm2

# Install Nginx (reverse proxy for HTTPS)
sudo apt-get install -y nginx

# Install Certbot (free SSL certificate)
sudo apt-get install -y certbot python3-certbot-nginx
```

### Step 3: Add Swap Space (CRITICAL — 1GB RAM is not enough for Next.js build)
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
# Make it permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
# Verify
free -h  # should show 2G swap
```

---

## Deploy the App

### Step 4: Clone + Install
```bash
cd /home/ubuntu
git clone https://github.com/yourusername/subtrack-ai.git
cd subtrack-ai
bun install
```

### Step 5: Configure .env
```bash
nano .env
```
Paste the contents from your local `.env` file (the one I created).
Make sure `NEXTAUTH_URL="https://subtrack.scanmymenu.in"`.

Save: `Ctrl+O`, `Enter`, `Ctrl+X`

### Step 6: Push database + build
```bash
# Push the database schema
bun run db:push

# Build the app (this takes 5-10 minutes on 1GB RAM — swap helps)
NODE_OPTIONS="--max-old-space-size=512" bun run build
```

> **If build fails with out-of-memory error:**
> ```bash
> # Increase swap to 4GB temporarily
> sudo fallocate -l 4G /swapfile2
> sudo chmod 600 /swapfile2
> sudo mkswap /swapfile2
> sudo swapon /swapfile2
> # Retry build
> NODE_OPTIONS="--max-old-space-size=768" bun run build
> # Remove extra swap after build
> sudo swapoff /swapfile2
> sudo rm /swapfile2
> ```

### Step 7: Start with PM2
```bash
# The standalone build runs on port 3000
NODE_ENV=production pm2 start .next/standalone/server.js --name subtrack-ai

# Save PM2 config (auto-restart on reboot)
pm2 save
pm2 startup  # follow the instructions it prints

# Check it's running
pm2 status
curl http://localhost:3000  # should return HTML
```

---

## Configure Nginx + SSL

### Step 8: Create Nginx config
```bash
sudo nano /etc/nginx/sites-available/subtrack
```
Paste this:
```nginx
server {
    listen 80;
    server_name subtrack.scanmymenu.in;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Stripe webhook needs raw body — increase client body size
    client_max_body_size 10M;
}
```
Enable + reload:
```bash
sudo ln -s /etc/nginx/sites-available/subtrack /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # remove default site
sudo nginx -t  # test config
sudo systemctl reload nginx
```

### Step 9: Get free SSL certificate
```bash
sudo certbot --nginx -d subtrack.scanmymenu.in
```
- Enter your email
- Agree to terms
- Choose "1" (no redirect) or "2" (redirect HTTP→HTTPS — RECOMMENDED)
- Certbot auto-renews via cron

### Step 10: Test HTTPS
```bash
curl https://subtrack.scanmymenu.in  # should return your app HTML
```

---

## DNS Configuration

### Step 11: Add DNS A record
In your domain registrar (wherever scanmymenu.in is managed):

| Type | Name | Value | TTL |
|---|---|---|---|
| A | subtrack | YOUR_ORACLE_SERVER_IP | 3600 |

Wait 5-30 minutes for DNS propagation. Verify:
```bash
dig subtrack.scanmymenu.in  # should show your server IP
```

---

## Update OAuth Redirect URIs

### Step 12: Update each provider's console

**Google Cloud Console:**
- Go to APIs & Services → Credentials → your OAuth client
- Add: `https://subtrack.scanmymenu.in/api/auth/callback/google`

**Azure Portal:**
- Go to App registrations → your app → Authentication
- Add: `https://subtrack.scanmymenu.in/api/auth/callback/azure-ad`

**Apple Developer:**
- Go to your Services ID → Return URLs
- Add: `https://subtrack.scanmymenu.in/api/auth/callback/apple`

**Stripe Dashboard:**
- Go to Developers → Webhooks → Add endpoint
- URL: `https://subtrack.scanmymenu.in/api/stripe/webhook`
- Events: `checkout.session.completed`, `customer.subscription.deleted`, `invoice.paid`
- Copy the signing secret → add to `.env` as `STRIPE_WEBHOOK_SECRET`

---

## Final Checklist

```
☐ 1. SSH into Oracle server
☐ 2. Install Node.js + Bun + Git + PM2 + Nginx + Certbot
☐ 3. Create 2GB swap (CRITICAL for 1GB RAM)
☐ 4. Clone repo + bun install
☐ 5. Configure .env with all credentials
☐ 6. bun run db:push
☐ 7. bun run build (with NODE_OPTIONS for memory)
☐ 8. pm2 start + pm2 save + pm2 startup
☐ 9. Configure Nginx reverse proxy
☐ 10. Get SSL certificate with certbot
☐ 11. Add DNS A record: subtrack → server IP
☐ 12. Update OAuth redirect URIs in Google/Microsoft/Apple
☐ 13. Add Stripe webhook URL
☐ 14. Test: https://subtrack.scanmymenu.in loads
☐ 15. Test: email OTP works (real email via Resend)
☐ 16. Test: Google sign-in works
☐ 17. Test: Premium upgrade works (Stripe checkout)
☐ 18. 🎉 Live!
```

---

## Maintenance Commands

```bash
# View app logs
pm2 logs subtrack-ai

# Restart app
pm2 restart subtrack-ai

# Update app (after git push)
cd /home/ubuntu/subtrack-ai
git pull
bun install
bun run build
pm2 restart subtrack-ai

# Check server health
pm2 monit
free -h
df -h
```

---

## Stripe Setup (for Premium payments)

1. Go to **dashboard.stripe.com** → Products → Add product
   - Name: "SubTrack AI Premium"
   - Pricing: Monthly recurring (e.g., $4.99/mo or ₹99/mo)
   - Copy the **Price ID** (starts with `price_`)
2. Add to `.env`: `STRIPE_PREMIUM_PRICE_ID="price_xxxxx"`
3. Go to Developers → Webhooks → Add endpoint
   - URL: `https://subtrack.scanmymenu.in/api/stripe/webhook`
   - Copy the **Signing secret** → add to `.env` as `STRIPE_WEBHOOK_SECRET`
4. Go to Developers → API Keys → copy **Secret key** → add to `.env` as `STRIPE_SECRET_KEY`
5. Restart: `pm2 restart subtrack-ai`

## Freemium Model

| Feature | Free | Premium |
|---|---|---|
| Subscriptions tracked | 3 max | Unlimited |
| AI quick-add (text/voice/scan) | ✅ | ✅ |
| AI insights with live prices | Basic | Full |
| Price verification | ✅ | ✅ |
| Gamification (spin, scratch, leaderboard) | ✅ | ✅ |
| Advanced deal alerts | ❌ | ✅ |
| Priority email support | ❌ | ✅ |
| Price | Free | $4.99/mo or ₹99/mo |

The app enforces the 3-subscription limit for free users automatically (returns HTTP 402 when they try to add a 4th). The Profile page shows an upgrade prompt when the limit is reached.
