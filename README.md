# Project Intervention Manager

The Cluster-Based Intervention Management System is a comprehensive platform designed to track and manage interventions, actions, and their outcomes.

## Features

This system provides end-to-end management of clusters, pathways, interventions, and actions, with integrated reporting and monitoring capabilities. Key features include:

- **Cluster Management:** Create and manage clusters with unique codes, define pathways within clusters, and track cluster progress and performance.
- **Intervention Management:** Create and track interventions within pathways, set intervention status, timeline, and budget, assign intervention leads, and manage related documents.
- **Action Tracking:** Create and manage actions within interventions, assign action leads and supporting staff, track action status and progress, and manage tasks within actions.
- **Indicator Monitoring:** Define quantitative and qualitative indicators, set targets, track progress, generate indicator reports, and upload supporting documents.
- **Reporting System:** Generate various report types (Progress, Financial, Impact, Custom) with a template designer, scheduled generation, multiple export formats, and data visualization options.

## Technical Stack

The system is built with the following technologies:

### Frontend
- **React:** A JavaScript library for building user interfaces.
- **TypeScript:** A typed superset of JavaScript that compiles to plain JavaScript.
- **Vite:** A fast build tool and development server.
- **TailwindCSS:** A utility-first CSS framework for responsive design.
- **React Query:** For state management and data fetching.
- **React Router:** For navigation within the application.

### Backend
- **Supabase:** An open-source Firebase alternative.
  - **PostgreSQL:** A powerful, open-source object-relational database system.
  - **Authentication:** Built-in user authentication and authorization (GoTrue).
  - **PostgREST:** Generates a RESTful API from your PostgreSQL database.
  - **Real-time subscriptions:** For live updates.
- **Supabase Storage:** For managing documents and media files.

## Getting Started

Follow these instructions to set up the project locally for development.

### Prerequisites

- Node.js (version 18.x or later recommended)
- npm (comes with Node.js)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd project-intervention-manager
    ```
    *(Replace `<repository-url>` with the actual URL of the repository)*

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root of the project and add the following variables:
    ```env
    VITE_SUPABASE_URL="your_supabase_url"
    VITE_SUPABASE_ROLE_KEY="your_supabase_anon_key"
    ```
    Replace `"your_supabase_url"` and `"your_supabase_anon_key"` with your actual Supabase project URL and anon key.

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application should now be running on `http://localhost:5173` (or the port specified by Vite).

## Available Scripts

In the project directory, you can run the following scripts:

-   **`npm run dev`**
    Runs the app in development mode using Vite. Open [http://localhost:5173](http://localhost:5173) (or the configured port) to view it in your browser. The page will reload if you make edits.

-   **`npm run build`**
    Builds the app for production to the `dist` folder. It correctly bundles React in production mode and optimizes the build for the best performance. The build also copies `dist/index.html` to `dist/404.html` for single-page application routing on some hosting platforms.

-   **`npm run lint`**
    Lints the project files using ESLint to identify and fix stylistic and code quality issues.

-   **`npm run preview`**
    Serves the production build locally using Vite to preview the app as it would appear in production.

## User Roles

The system defines several user roles with varying levels of access and responsibility:

-   **Administrator:** Full system access, including user management, system configuration, and analytics.
-   **Project Manager:** Manages clusters, assigns teams, generates reports, and oversees budgets.
-   **Action Lead:** Plans and executes actions, coordinates teams, provides progress updates, and manages documents.
-   **Team Member:** Executes assigned tasks, reports progress, uploads documents, and provides feedback.
-   **Viewer:** Read-only access to view reports and dashboards.

## Contributing

Contributions to this project are welcome. If you are interested in contributing, please consider the following general guidelines:

1.  Fork the repository.
2.  Create a new branch for your feature or bug fix (`git checkout -b feature/your-feature-name` or `bugfix/your-bug-fix-name`).
3.  Make your changes and commit them with clear, descriptive messages.
4.  Push your changes to your forked repository.
5.  Open a pull request to the main project repository for review.

Please ensure your code adheres to the project's linting standards (run `npm run lint`).

## License

This project is currently private and used for internal purposes. It does not have an open-source license.
