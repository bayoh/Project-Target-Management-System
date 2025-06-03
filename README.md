# Project Intervention Manager - Developer Manual

This document serves as a guide for developers working on the Project Intervention Manager system. It provides information about the project architecture, setup, development process, and coding conventions.

## 1. Project Overview

The **Project Intervention Manager** is a comprehensive platform designed to track and manage interventions, actions, and their outcomes within various clusters and pathways. It aims to provide a robust solution for government agencies, NGOs, and project management teams.

For a detailed understanding of the project's requirements, features, system architecture, data models, and more, please refer to the following documents:

*   **Product Requirements Document (PRD):** [`docs/PRD.md`](docs/PRD.md)
*   **User Manual:** [`docs/USER_MANUAL.md`](docs/USER_MANUAL.md) (Provides insight into how users interact with the system)

## 2. Tech Stack

The project utilizes the following core technologies:

*   **Frontend:**
    *   React
    *   TypeScript
    *   Vite (Build tool)
    *   TailwindCSS (Styling)
    *   React Router (Navigation)
*   **Backend & Database:**
    *   Supabase (PostgreSQL database, Authentication, Storage)
*   **Deployment:**
    *   Netlify

## 3. Getting Started

Follow these steps to set up your local development environment:

### 3.1. Prerequisites

*   Node.js (LTS version recommended)
*   npm (comes with Node.js)
*   Git

### 3.2. Clone the Repository

```bash
git clone <repository-url> # Replace <repository-url> with the actual URL
cd project-intervention-manager
```

### 3.3. Install Dependencies

Install the project dependencies using npm:

```bash
npm install
```

### 3.4. Environment Variables

The application requires environment variables to connect to Supabase and other services.

1.  Create a `.env` file in the root of the project.
2.  You will need to add your Supabase Project URL and Anon Key. These can be found in your Supabase project's API settings.

    ```env
    VITE_SUPABASE_URL="your-supabase-project-url"
    VITE_SUPABASE_ANON_KEY="your-supabase-anon-key"
    ```

    **Note:** Refer to the Supabase documentation and the `src/lib/supabase.ts` file for any other potential environment variables that might be required as the project evolves.

### 3.5. Run the Development Server

Once the dependencies are installed and environment variables are set, you can start the development server:

```bash
npm run dev
```

This will typically start the application on `http://localhost:5173` (Vite's default) or another port if specified.

## 4. Project Structure

The project follows a standard structure for React applications. Key directories include:

*   `.`: Root directory containing configuration files like `vite.config.ts`, `tailwind.config.js`, `package.json`, and this `README.md`.
*   `public/`: Static assets that are served directly.
*   `src/`: Contains all the frontend application source code.
    *   `main.tsx`: The entry point of the React application.
    *   `App.tsx`: Defines the main application component, including routing.
    *   `components/`: Reusable UI components (e.g., buttons, forms, layout elements).
        *   `actions/`, `auth/`, `dashboard/`, etc.: Subdirectories for feature-specific components.
    *   `pages/`: Top-level components that correspond to application routes/views.
        *   `actions/`, `interventions/`, `reports/`, `settings/`, etc.: Subdirectories for feature-specific pages.
    *   `lib/`: Modules for interacting with external services or containing core business logic.
        *   `supabase.ts`: Supabase client initialization and configuration.
        *   `*Api.ts` (e.g., `actionApi.ts`, `clusterApi.ts`): Functions for making API calls to Supabase for specific data entities.
    *   `types/`: TypeScript type definitions and interfaces (e.g., `auth.ts`, `project.ts`).
    *   `assets/`: Static assets like images, fonts, etc., that are imported into components. (Note: This directory was not explicitly listed in `ls` but is a common convention. If not used, this line can be removed).
    *   `index.css`: Global styles and TailwindCSS base directives.
*   `supabase/`: Contains backend configurations for Supabase.
    *   `migrations/`: SQL migration files for database schema changes. This is critical for understanding the data model and evolving it.
*   `docs/`: Contains detailed project documentation.
    *   `PRD.md`: Product Requirements Document.
    *   `USER_MANUAL.md`: User Manual for the application.
    *   `TABLE_TROUBLESHOOTING.md`: Troubleshooting guide for tables.

## 5. Backend (Supabase)

The backend for this project is powered by [Supabase](https://supabase.io/), an open-source Firebase alternative. Supabase provides:

*   **PostgreSQL Database:** A robust relational database.
*   **Authentication:** Manages user sign-up, login, and access control.
*   **Storage:** For storing files like documents and images.
*   **Realtime APIs:** For real-time data synchronization if used.
*   **Auto-generated APIs:** Supabase automatically generates RESTful APIs based on your database schema.

### 5.1. Database Schema & Migrations

*   The database schema is managed through SQL migration files located in the `supabase/migrations/` directory.
*   When making changes to the database structure, new migration files should be created using Supabase CLI tools (or manually, following the established pattern).
*   It's crucial to keep migrations in sync with your local development database and apply them correctly in staging/production environments. Refer to Supabase documentation for best practices on schema migrations.

### 5.2. API Interaction

*   The frontend interacts with the Supabase backend via the Supabase client library (`@supabase/supabase-js`).
*   The client is initialized in `src/lib/supabase.ts`.
*   API calls for specific data entities are typically organized into modules within `src/lib/` (e.g., `src/lib/actionApi.ts`, `src/lib/clusterApi.ts`).

### 5.3. Row Level Security (RLS)

*   As detailed in the `docs/PRD.md`, the project utilizes Supabase's Row Level Security (RLS) to control data access.
*   Ensure that appropriate RLS policies are defined for all tables to protect sensitive data and ensure users can only access data they are permitted to.
*   When developing new features or modifying existing ones, always consider the RLS implications.

## 6. Available Scripts

The `package.json` file includes several scripts for common development tasks:

*   `npm run dev`:
    *   Starts the Vite development server with Hot Module Replacement (HMR).
    *   This is the primary command you'll use for local development.

*   `npm run build`:
    *   Builds the application for production.
    *   The output is placed in the `dist/` directory.
    *   It also copies `dist/index.html` to `dist/404.html`, likely for handling client-side routing on platforms like Netlify.

*   `npm run lint`:
    *   Runs ESLint to analyze the codebase for potential errors and style issues.
    *   It's recommended to run this before committing your changes.

*   `npm run preview`:
    *   Starts a local static web server that serves the files from `dist/`.
    *   Useful for previewing the production build locally before deploying.

## 7. Coding Conventions and Linting

To maintain code quality, consistency, and readability, the project uses ESLint.

*   **ESLint Configuration:** The ESLint rules are defined in `eslint.config.js`.
*   **Running the Linter:** Before committing any changes, please run the linter to catch potential issues:
    ```bash
    npm run lint
    ```
*   **IDE Integration:** It is highly recommended to integrate ESLint into your IDE for real-time feedback during development. Most modern IDEs (like VS Code) support this through extensions.
*   **Style Guide:** While ESLint enforces many rules, also strive to follow general best practices for TypeScript and React development (e.g., clear naming conventions, component composition, effective state management). When in doubt, refer to existing code for patterns or discuss with the team.

## 8. Deployment

The application is configured for deployment on [Netlify](https://www.netlify.com/).

*   **Configuration:** Deployment settings, including build commands and redirect rules, can be found in `netlify.toml`.
*   **Build Process:** Netlify typically uses the `npm run build` command (or as specified in `netlify.toml`) to build the project.
*   **Branch Deploys:** Netlify can be configured to automatically deploy branches, allowing for previews of new features or staging environments. (Verify your project's specific Netlify setup).
