# Docker Desktop Installation Guide

## Installing Docker Desktop on Windows

### Step 1: System Requirements
- Windows 10 64-bit: Pro, Enterprise, or Education (Build 15063 or later)
- OR Windows 11
- Hyper-V and Containers Windows features must be enabled
- At least 4GB RAM

### Step 2: Download Docker Desktop
1. Go to https://www.docker.com/products/docker-desktop/
2. Click "Download for Windows"
3. Download the Docker Desktop Installer.exe file

### Step 3: Install Docker Desktop
1. Double-click Docker Desktop Installer.exe to run the installer
2. Follow the installation wizard:
   - Accept the license agreement
   - Choose installation location (default is recommended)
   - Enable WSL 2 integration if prompted
3. Click "Install" and wait for the installation to complete
4. Click "Close" when installation is finished

### Step 4: Start Docker Desktop
1. Search for "Docker Desktop" in Start menu and launch it
2. Accept the Docker Subscription Service Agreement if prompted
3. Wait for Docker to start (you'll see the Docker icon in the system tray)
4. Docker Desktop is ready when the icon stops animating

### Step 5: Verify Installation
Open PowerShell or Command Prompt and run:
```powershell
docker --version
docker compose version
```

You should see version information for both commands.

### Alternative: Using Windows Package Manager (Winget)
If you have Windows Package Manager installed:
```powershell
winget install Docker.DockerDesktop
```

### Troubleshooting
- If you get virtualization errors, enable Hyper-V in Windows Features
- If you get WSL 2 errors, install WSL 2 from Microsoft Store
- Restart your computer after enabling Windows features
- Make sure your Windows is updated to the latest version

### Next Steps
Once Docker Desktop is installed and running:
1. Return to the DrSync project directory
2. Run the setup script: `.\scripts\setup.ps1`
3. Verify the installation with: `.\scripts\check-setup.ps1`
