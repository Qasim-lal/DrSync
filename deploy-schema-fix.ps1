# Deploy Prisma Schema Fix to VPS
# This script pulls the latest changes, regenerates Prisma client, and rebuilds the backend

$VPS_IP = "62.146.239.128"
$VPS_USER = "root"

Write-Host "===== Deploying Schema Fix to VPS =====" -ForegroundColor Cyan

# Step 1: Pull latest changes
Write-Host "`n[1/5] Pulling latest changes from Git..." -ForegroundColor Yellow
ssh ${VPS_USER}@${VPS_IP} "cd /root/DrSync && git pull origin feature/phase3-whatsapp-integration"

# Step 2: Regenerate Prisma Client
Write-Host "`n[2/5] Regenerating Prisma Client..." -ForegroundColor Yellow
ssh ${VPS_USER}@${VPS_IP} "cd /root/DrSync/backend && docker exec drsync-backend-prod npx prisma generate"

# Step 3: Rebuild backend container
Write-Host "`n[3/5] Rebuilding backend container..." -ForegroundColor Yellow
ssh ${VPS_USER}@${VPS_IP} "cd /root/DrSync && docker-compose -f docker-compose.prod.yml build backend"

# Step 4: Restart backend container
Write-Host "`n[4/5] Restarting backend container..." -ForegroundColor Yellow
ssh ${VPS_USER}@${VPS_IP} "cd /root/DrSync && docker-compose -f docker-compose.prod.yml up -d backend"

# Step 5: Verify backend is running
Write-Host "`n[5/5] Verifying backend is running..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
ssh ${VPS_USER}@${VPS_IP} "cd /root/DrSync && docker-compose -f docker-compose.prod.yml ps backend"

Write-Host "`n===== Deployment Complete! =====" -ForegroundColor Green
Write-Host "Backend should now be running with the updated Prisma schema." -ForegroundColor Green
Write-Host "You can test registration at: http://62.146.239.128:3000/signup" -ForegroundColor Cyan
