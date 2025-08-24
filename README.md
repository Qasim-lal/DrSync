# DrSync - Healthcare Appointment Management System

🎉 **Phase 1 Complete!** - Full-stack foundation with Docker containerization

DrSync is a comprehensive healthcare appointment management solution that bridges the communication gap between medical practitioners and patients through intelligent WhatsApp automation.

## 🚀 Current Status

**✅ Phase 1 Complete (100%)** - Foundation & Environment Setup  
**🔄 Phase 2 Next** - Backend API Development

### What's Working Now:
- ✅ Complete Docker development environment
- ✅ Next.js 14 frontend with TypeScript & Tailwind CSS
- ✅ Node.js Express backend with health monitoring
- ✅ PostgreSQL and Redis integration
- ✅ Real-time system status dashboard
- ✅ Responsive UI with proper styling
- ✅ Development workflow with hot-reload

**🔗 GitHub Repository:** https://github.com/Qasim-lal/DrSync

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop/)
- **Git** - [Download here](https://git-scm.com/)

### Automated Setup (Recommended)

Run the setup script to automatically configure your development environment:

```powershell
# PowerShell (Windows)
.\scripts\setup.ps1
```

### Manual Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Qasim-lal/DrSync.git
   cd DrSync
   ```

2. **Create environment files**
   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env.local
   ```

3. **Install dependencies**
   ```bash
   # Backend
   cd backend
   npm install
   cd ..

   # Frontend
   cd frontend
   npm install
   cd ..
   ```

4. **Start services**
   ```bash
   # Start database and cache services
   docker compose -f docker-compose.dev.yml up -d postgres redis

   # Start backend (in a new terminal)
   cd backend
   npm run dev

   # Start frontend (in another new terminal)
   cd frontend
   npm run dev
   ```

## 🌐 Application URLs

- **Frontend Dashboard**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api/docs
- **PgAdmin** (if enabled): http://localhost:5050

## 🏗️ Project Structure

```
DrSync/
├── backend/                 # Node.js/Express API server
│   ├── src/
│   │   ├── controllers/     # API controllers
│   │   ├── models/          # Database models
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Custom middleware
│   │   └── utils/           # Helper utilities
│   ├── migrations/          # Database migrations
│   └── tests/               # Backend tests
├── frontend/                # Next.js React application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Next.js pages
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API services
│   │   └── utils/           # Helper utilities
│   └── public/              # Static assets
├── shared/                  # Shared types and utilities
├── docs/                    # Project documentation
├── scripts/                 # Development scripts
└── .github/                 # GitHub workflows
```

## 📊 Project Status

### Phase Progress Overview
| Phase | Status | Progress | Description |
|-------|--------|----------|-------------|
| Phase 1: Foundation | ✅ Complete | 100% | Docker, frontend, backend setup |
| Phase 2: Backend API | 🔄 Next | 10% | Patient & appointment APIs |
| Phase 3: Frontend Dashboard | ⏳ Pending | 0% | Complete dashboard UI |
| Phase 4: WhatsApp Integration | ⏳ Pending | 0% | Booking & notifications |
| Phase 5: Google Sheets | ⏳ Pending | 0% | Data synchronization |
| Phase 6: Testing & QA | ⏳ Pending | 0% | Comprehensive testing |
| Phase 7: Deployment | ⏳ Pending | 0% | Production launch |

### Key Achievements 🏆
- **Docker Environment**: All services containerized and working
- **Full-Stack Communication**: Frontend ↔ Backend ↔ Database operational
- **Health Monitoring**: Real-time system status tracking
- **Professional Git Workflow**: main/develop branches with proper structure
- **Responsive UI**: Mobile-friendly design with Tailwind CSS
- **Development Tools**: Hot-reload, TypeScript, ESLint configured

## 🛠️ Development Commands

### Backend Commands
```bash
cd backend
npm run dev         # Start development server
npm run build       # Build for production
npm run test        # Run tests
npm run lint        # Lint code
npm run format      # Format code
```

### Frontend Commands
```bash
cd frontend
npm run dev         # Start development server
npm run build       # Build for production
npm run test        # Run tests
npm run lint        # Lint code
npm run format      # Format code
```

### Docker Commands
```bash
# Start all services (recommended)
docker compose -f docker-compose.dev.yml up

# Start in background
docker compose -f docker-compose.dev.yml up -d

# Start specific services
docker compose -f docker-compose.dev.yml up postgres redis

# Stop all services
docker compose -f docker-compose.dev.yml down

# View logs
docker compose -f docker-compose.dev.yml logs -f [service-name]

# Rebuild services (after code changes)
docker compose -f docker-compose.dev.yml build

# Current running services status
docker ps
```

## 🗃️ Database

### PostgreSQL Schema
The database schema is automatically created when starting the PostgreSQL container. The initial migration script creates:

- Organizations (multi-tenancy support)
- Users (healthcare providers and staff)
- Patients (cached from Google Sheets)
- Providers (doctors and healthcare providers)
- Appointments (synced with Google Sheets)
- WhatsApp messages log
- Message templates
- Audit logs

### Database Access
- **Host**: localhost
- **Port**: 5432
- **Database**: drsync_dev
- **Username**: drsync_user
- **Password**: drsync_password_dev

## 📱 API Documentation

The backend API is documented using OpenAPI/Swagger. Once the backend is running, visit:
http://localhost:3001/api/docs

## 🧪 Testing

### Backend Testing
```bash
cd backend
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

### Frontend Testing
```bash
cd frontend
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

## 🎨 Code Style

This project uses ESLint and Prettier for consistent code formatting:

```bash
# Check formatting
npm run format:check

# Auto-fix formatting
npm run format

# Lint code
npm run lint

# Auto-fix linting issues
npm run lint:fix
```

## 🔧 Environment Variables

### Backend (.env)
Key environment variables for backend configuration:

- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port (default: 3001)
- `DB_*`: PostgreSQL connection settings
- `REDIS_*`: Redis connection settings
- `JWT_SECRET`: JWT signing secret
- `WHATSAPP_*`: WhatsApp Business API credentials
- `GOOGLE_SHEETS_*`: Google Sheets API credentials

### Frontend (.env.local)
Key environment variables for frontend configuration:

- `NEXT_PUBLIC_API_URL`: Backend API URL
- `NEXTAUTH_SECRET`: NextAuth secret
- `NEXTAUTH_URL`: Application URL

## 🚨 Troubleshooting

### Common Issues

1. **Docker services won't start**
   ```bash
   docker compose -f docker-compose.dev.yml down
   docker system prune
   docker compose -f docker-compose.dev.yml up
   ```

2. **Port conflicts**
   - Check if ports 3000, 3001, 5432, or 6379 are in use
   - Update port configurations in docker-compose.dev.yml

3. **Permission errors**
   ```bash
   # Windows
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

   # Linux/Mac
   chmod +x scripts/setup.sh
   ```

4. **Node modules issues**
   ```bash
   # Delete node_modules and reinstall
   rm -rf backend/node_modules frontend/node_modules
   cd backend && npm install
   cd ../frontend && npm install
   ```

## 📋 Development Workflow

### 🚨 **CRITICAL GIT RULES** 🚨
**❌ NEVER push directly to `main` or `develop` branches**  
**✅ ALWAYS use feature branches for ALL changes**

### Mandatory Workflow:
1. **Feature Development**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-task-name
   # Do your work...
   git push -u origin feature/your-task-name
   # Create PR: feature/your-task-name → develop
   ```

2. **Code Quality**
   - Pre-commit hooks run ESLint and Prettier
   - All tests must pass
   - Code coverage should be maintained
   - Pull request review required

3. **Database Changes**
   - Create migration scripts in `backend/migrations/`
   - Test migrations locally
   - Document schema changes

**📖 Full workflow details:** [See .github/DEVELOPMENT_WORKFLOW.md](.github/DEVELOPMENT_WORKFLOW.md)

## 📚 Additional Resources

- [Project Requirements Document](./docs/drsync_prd.md)
- [Software Requirements Specification](./docs/DrSync_SRS.md)
- [Technical Design Document](./docs/DrSync_TDD.md)
- [API Documentation](./docs/DrSync_API_Documentation.md)
- [Development Specifications](./docs/DrSync_DevSpecs.md)

## 🤝 Contributing

We're currently in **Phase 1 Complete** status! Ready to move to Phase 2.

### Current Development Focus
- **Next Phase**: Backend API Development (Patient & Appointment management)
- **Branch**: Work on `develop` branch
- **Priority**: Database models, authentication, CRUD APIs

### How to Contribute
1. Fork the repository
2. Create a feature branch from `develop`
3. Follow the established coding standards
4. Ensure all tests pass
5. Submit a pull request to `develop`

Please read the project documentation in the `docs/` folder before contributing.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
