# DrSync - Healthcare Appointment Management System

DrSync is a comprehensive healthcare appointment management solution that bridges the communication gap between medical practitioners and patients through intelligent WhatsApp automation.

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
   git clone <repository-url>
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
# Start all services
docker compose -f docker-compose.dev.yml up

# Start specific services
docker compose -f docker-compose.dev.yml up postgres redis

# Stop all services
docker compose -f docker-compose.dev.yml down

# View logs
docker compose -f docker-compose.dev.yml logs -f [service-name]

# Rebuild services
docker compose -f docker-compose.dev.yml build
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

1. **Feature Development**
   - Create feature branch from `main`
   - Develop and test locally
   - Run linting and tests
   - Create pull request

2. **Code Quality**
   - Pre-commit hooks run ESLint and Prettier
   - All tests must pass
   - Code coverage should be maintained

3. **Database Changes**
   - Create migration scripts in `backend/migrations/`
   - Test migrations locally
   - Document schema changes

## 📚 Additional Resources

- [Project Requirements Document](./docs/drsync_prd.md)
- [Software Requirements Specification](./docs/DrSync_SRS.md)
- [Technical Design Document](./docs/DrSync_TDD.md)
- [API Documentation](./docs/DrSync_API_Documentation.md)
- [Development Specifications](./docs/DrSync_DevSpecs.md)

## 🤝 Contributing

Please read the project documentation in the `docs/` folder before contributing. Follow the established coding standards and ensure all tests pass.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
