# Project Intervention Manager

A comprehensive React/TypeScript Single Page Application (SPA) for managing project interventions, actions, and reporting. Built with modern web technologies and integrated with Supabase for backend services.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Development](#development)
- [Testing](#testing)
- [Building](#building)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Contributing](#contributing)

## Overview

Project Intervention Manager is a web application designed to help organizations track and manage interventions, actions, targets, and generate comprehensive reports. The application provides role-based access control, real-time activity tracking, and comprehensive reporting capabilities.

## Tech Stack

- **Frontend Framework**: React 18.3+ with TypeScript
- **Build Tool**: Vite 5.4+
- **State Management**: TanStack Query (React Query) 5.84+
- **Routing**: React Router v6
- **Styling**: TailwindCSS 3.4+
- **Backend**: Supabase (PostgreSQL, Authentication, Storage, RLS)
- **UI Components**: Radix UI, Headless UI, Lucide React Icons
- **Form Validation**: Zod
- **Notifications**: React Hot Toast
- **PDF Generation**: React PDF Renderer
- **Testing**: Vitest, React Testing Library

## Features

- **User Management**: Role-based access control (Super Admin, Leadership, Lead, Supporting Staff)
- **Project Management**: Hierarchical structure (Clusters → Pathways → Interventions → Actions)
- **Action Tracking**: Track actions with status, assignments, achievements, issues, and needs
- **Target Management**: Set and track quantitative targets with history
- **Reporting**: Generate comprehensive action reports with PDF export
- **Activity Logging**: Track user activities and sessions
- **Document Management**: Upload and manage documents for interventions and actions
- **Dashboard Analytics**: Visualize project statistics and metrics

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v18.0.0 or higher
- **npm** or **yarn**: Latest version
- **Supabase Account**: For backend services
- **Git**: For version control

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd FCC
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

## Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous/public key

**Important**: Never commit the `.env` file to version control. Only use the anon key, never the service role key in client-side code.

### Supabase Setup

1. Create a new Supabase project
2. Run the migrations from `supabase/migrations/` directory
3. Configure Row Level Security (RLS) policies as needed
4. Set up storage buckets for documents and achievements

## Development

### Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Development Features

- Hot Module Replacement (HMR) enabled
- React Query Devtools available in development
- Source maps for debugging
- ESLint for code quality

### Code Organization

The project follows a feature-based structure:

```
src/
├── components/     # Reusable UI components
├── pages/          # Page components (routes)
├── hooks/          # Custom React hooks
├── lib/            # Utility functions and API clients
├── types/          # TypeScript type definitions
└── test/           # Test utilities and setup
```

## Testing

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Structure

- Unit tests for utilities and hooks
- Component tests with React Testing Library
- Integration tests for critical user flows

## Building

### Production Build

```bash
npm run build
```

The build output will be in the `dist/` directory.

### Bundle Analysis

Analyze bundle size and composition:

```bash
npm run analyze
```

This will generate a visual report showing bundle composition and sizes.

### Build Output

- Optimized and minified JavaScript bundles
- Code splitting for better performance
- CSS extraction and optimization
- Asset optimization

## Deployment

### Netlify

1. Connect your repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables in Netlify dashboard
5. The `_redirects` file ensures proper SPA routing

### Vercel

1. Import your repository to Vercel
2. Set framework preset to Vite
3. Add environment variables
4. Deploy

### Other Platforms

The application is a static SPA and can be deployed to any static hosting service:
- AWS S3 + CloudFront
- GitHub Pages
- Azure Static Web Apps
- Any CDN or static file server

## Project Structure

```
FCC/
├── src/
│   ├── components/        # React components
│   │   ├── auth/          # Authentication components
│   │   ├── ui/            # Reusable UI components
│   │   ├── actions/       # Action-related components
│   │   └── ...
│   ├── pages/             # Page components
│   ├── hooks/             # Custom hooks
│   ├── lib/               # Utilities and API
│   │   ├── api/           # API modules (users, projects, reports, jobs)
│   │   ├── auth.tsx       # Authentication context
│   │   ├── supabase.ts    # Supabase client
│   │   └── ...
│   ├── types/             # TypeScript types
│   └── test/              # Test utilities
├── supabase/
│   └── migrations/        # Database migrations
├── public/                # Static assets
├── .env.example           # Environment variable template
├── vite.config.ts         # Vite configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # Dependencies and scripts
```

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Write tests for new features
4. Ensure all tests pass
5. Submit a pull request

### Code Standards

- Follow TypeScript best practices
- Use ESLint for code quality
- Write meaningful commit messages
- Add JSDoc comments for public APIs
- Follow the existing code style

## License

[Add your license information here]

## Support

For issues and questions, please open an issue in the repository.

