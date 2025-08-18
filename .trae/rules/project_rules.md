# Project Rules for Cluster-Based Intervention Management System

## 1. Project Overview

This is a comprehensive project management system built with React, TypeScript, and Supabase, designed for tracking clusters, pathways, interventions, and actions with integrated reporting capabilities.

**Tech Stack:**
- Frontend: React 18 + TypeScript + Vite
- Styling: TailwindCSS + Radix UI components
- Backend: Supabase (PostgreSQL + Authentication)
- State Management: React hooks + Context API
- Routing: React Router v6
- Build Tool: Vite

## 2. Code Organization & Architecture

### 2.1 Directory Structure
```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components (button, input, etc.)
│   ├── layout/         # Layout components
│   ├── auth/           # Authentication components
│   ├── dashboard/      # Dashboard-specific components
│   └── [feature]/      # Feature-specific components
├── pages/              # Route components
├── lib/                # Utilities and configurations
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
└── main.tsx           # Application entry point
```

### 2.2 Component Organization Rules
- **Feature-based grouping**: Components organized by domain (actions, interventions, reports)
- **UI components**: Reusable components in `components/ui/`
- **Page components**: Route-level components in `pages/`
- **Shared components**: Cross-feature components in appropriate subdirectories

## 3. TypeScript & Type Safety

### 3.1 Type Definitions
- All types defined in `src/types/` directory
- Use interfaces for object shapes
- Use type unions for status enums: `'not_started' | 'in_progress' | 'at_risk' | 'completed'`
- Extend `BaseEntity` interface for all database entities

### 3.2 Type Safety Rules
- **Strict TypeScript**: All files must use TypeScript (.tsx/.ts)
- **No `any` types**: Use proper typing or `unknown` with type guards
- **Interface inheritance**: Use `BaseEntity` for all database entities
- **Enum types**: Use string literal unions for status fields

### 3.3 Required Base Interface
```typescript
export interface BaseEntity {
  id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}
```

## 4. Database & Supabase Rules

### 4.1 Database Schema Conventions
- **UUID primary keys**: All tables use `uuid` primary keys with `gen_random_uuid()`
- **Timestamps**: All tables include `created_at` and `updated_at` with `timestamptz`
- **User tracking**: All tables include `created_by` referencing `auth.users(id)`
- **Soft constraints**: Use CHECK constraints for data validation
- **Cascade deletes**: Use `ON DELETE CASCADE` for parent-child relationships

### 4.2 Migration Standards
- **Descriptive names**: Use descriptive migration names (e.g., `20250124100801_sunny_thunder.sql`)
- **RLS enabled**: All tables must have Row Level Security enabled
- **Policies required**: Create appropriate RLS policies for each table
- **Indexes**: Add indexes for foreign keys and frequently queried columns

### 4.3 Security Rules
- **RLS policies**: Users can only access data they own or are authorized to view
- **Role-based access**: Implement role-based permissions (super_admin, admin, user)
- **Audit trails**: Track all data changes with user attribution

## 5. Component Development Standards

### 5.1 Component Structure
```typescript
// Required imports
import React from 'react';
import { ComponentProps } from './types';

// Component definition with proper typing
export function ComponentName({ prop1, prop2 }: ComponentProps) {
  // Component logic
  return (
    <div className="component-styles">
      {/* JSX content */}
    </div>
  );
}
```

### 5.2 Component Rules
- **Functional components**: Use function declarations, not arrow functions for components
- **Props interface**: Define props interface for all components
- **Default exports**: Use named exports for components
- **React imports**: Always import React explicitly
- **Forward refs**: Use `React.forwardRef` for UI components that need ref access

### 5.3 UI Component Standards
- **Radix UI base**: Use Radix UI primitives for complex components
- **Class Variance Authority**: Use `cva` for component variants
- **Tailwind merge**: Use `cn()` utility for className merging
- **Consistent variants**: Follow established variant patterns (default, destructive, outline, etc.)

## 6. Styling Guidelines

### 6.1 TailwindCSS Rules
- **Utility-first**: Use Tailwind utility classes
- **Custom CSS**: Minimize custom CSS, prefer Tailwind utilities
- **Responsive design**: Use responsive prefixes (sm:, md:, lg:, xl:)
- **Dark mode**: Support dark mode with `dark:` prefix

### 6.2 Design System
- **CSS variables**: Use CSS custom properties for theme colors
- **Consistent spacing**: Use Tailwind spacing scale
- **Typography**: Use consistent text sizes and weights
- **Color palette**: Stick to defined color scheme (primary, secondary, destructive, etc.)

## 7. State Management

### 7.1 State Rules
- **Local state**: Use `useState` for component-local state
- **Context API**: Use React Context for shared state (auth, theme)
- **Custom hooks**: Extract complex state logic into custom hooks
- **No global state library**: Avoid Redux/Zustand unless absolutely necessary

### 7.2 Data Fetching
- **Supabase client**: Use centralized Supabase client from `lib/supabase.ts`
- **Error handling**: Always handle errors in data fetching
- **Loading states**: Show loading indicators during async operations
- **Real-time subscriptions**: Use Supabase real-time for live updates

## 8. Authentication & Authorization

### 8.1 Auth Implementation
- **Supabase Auth**: Use Supabase authentication system
- **Context provider**: Wrap app with `AuthProvider`
- **Route protection**: Protect routes based on authentication status
- **Role-based access**: Implement role-based component rendering

### 8.2 Session Management
- **Activity tracking**: Log user activities with session tracking
- **Session cleanup**: Properly cleanup sessions on logout
- **Auto-logout**: Handle session expiration gracefully

## 9. Error Handling & Logging

### 9.1 Error Handling
- **Try-catch blocks**: Wrap async operations in try-catch
- **User feedback**: Show user-friendly error messages
- **Toast notifications**: Use react-hot-toast for notifications
- **Error boundaries**: Implement error boundaries for component trees

### 9.2 Activity Logging
- **User actions**: Log all significant user actions
- **Entity tracking**: Track entity types and actions
- **Session correlation**: Associate activities with user sessions

## 10. Performance & Optimization

### 10.1 Bundle Optimization
- **Code splitting**: Use dynamic imports for route-based splitting
- **Tree shaking**: Ensure proper tree shaking with ES modules
- **Dependency optimization**: Exclude problematic dependencies (lucide-react)

### 10.2 Database Performance
- **Indexes**: Create indexes for foreign keys and query patterns
- **Query optimization**: Use efficient queries and avoid N+1 problems
- **Pagination**: Implement pagination for large datasets

## 11. Testing & Quality Assurance

### 11.1 Code Quality
- **ESLint**: Follow ESLint configuration
- **TypeScript strict**: Use strict TypeScript settings
- **Prettier**: Use consistent code formatting
- **No console.log**: Remove debug logs before production

### 11.2 Testing Strategy
- **Component testing**: Test component behavior and props
- **Integration testing**: Test component interactions
- **E2E testing**: Test critical user flows

## 12. Deployment & Environment

### 12.1 Environment Variables
- **Supabase config**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ROLE_KEY`
- **Environment-specific**: Use different configs for dev/staging/prod
- **Security**: Never commit secrets to repository

### 12.2 Build Process
- **Vite build**: Use `vite build` for production builds
- **404 handling**: Copy index.html to 404.html for SPA routing
- **Asset optimization**: Optimize images and static assets

## 13. Documentation Standards

### 13.1 Code Documentation
- **JSDoc comments**: Document complex functions and components
- **README files**: Maintain README for setup instructions
- **API documentation**: Document custom hooks and utilities

### 13.2 Project Documentation
- **PRD maintenance**: Keep Product Requirements Document updated
- **Data model**: Maintain comprehensive data model documentation
- **Migration logs**: Document database schema changes

## 14. Security Best Practices

### 14.1 Data Security
- **Input validation**: Validate all user inputs
- **SQL injection**: Use parameterized queries
- **XSS prevention**: Sanitize user-generated content
- **CSRF protection**: Implement CSRF protection

### 14.2 Access Control
- **Principle of least privilege**: Grant minimum required permissions
- **Role validation**: Validate user roles on both client and server
- **Session security**: Implement secure session management

## 15. Maintenance & Updates

### 15.1 Dependency Management
- **Regular updates**: Keep dependencies updated
- **Security patches**: Apply security updates promptly
- **Breaking changes**: Test thoroughly after major updates

### 15.2 Database Maintenance
- **Migration strategy**: Plan and test database migrations
- **Backup procedures**: Implement regular backup procedures
- **Performance monitoring**: Monitor database performance
