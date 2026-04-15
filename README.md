# 🏆 FestFlow: University Tournament Management System

FestFlow is a premium, retro-themed tournament management application designed for university fests. It features a unique **pixel-art aesthetic**, robust **multi-role access control**, and **real-time interactivity** powered by React Router 7 and Supabase.

---

## ✨ Features

### 🔐 Multi-Role Access Control
The application supports four distinct user roles, each with a tailored dashboard and set of permissions:
*   **Administrator**: Full control over tournaments, events, user approvals, and platform configuration.
*   **Event Manager**: Dedicated access to assigned events for managing brackets and recording results.
*   **Team Captain**: Ability to register their department team for events and manage their roster of participants.
*   **Participant**: Public access to view tournament schedules, real-time leaderboards, and detailed brackets.

### 🏆 Tournament & Event Management
*   **Lifecycle Management**: Create tournaments with specific dates and venues. Manage event statuses from `upcoming` to `ongoing` to `completed`.
*   **Dual Event Formats**:
    *   **Tournament Brackets**: Auto-generated brackets for head-to-head matches (e.g., Cricket, Football). supports single-elimination logic.
    *   **Judged Events**: Simplified result entry for performance-based events (e.g., Singing, Group Dance) where 1st, 2nd, and 3rd place are awarded.
*   **Flexible Scoring**: Customizable point systems for different place finishes (e.g., 10pts for 1st, 6pts for 2nd).

### 👥 Team & Participant Logistics
*   **Department-Based Teams**: Formal registration flow for department teams (MCA, MBA, etc.) with Admin approval.
*   **Roster Management**: Team Captains can assign specific members to specific events (e.g., selecting the starting 11 for Cricket).
*   **Unified Participant Profiles**: Profiles linked to Supabase Auth for secure login and data mapping.

### 📊 Real-Time Interaction
*   **Dynamic Leaderboards**: A global tournament standings table that updates automatically as results are recorded.
*   **Interactive Brackets**: Visual, responsive bracket UI for tracking match progress.
*   **Standings Sidebar**: Quick-access standings visible on management pages to help admins and managers monitor the overall fest progress.

### 🎨 Retro-Premium UI/UX
*   **Pixel-Art Design System**: A custom-built UI using a curated color palette (`pixel-gold`, `pixel-cyan`, `pixel-purple`) and retro typography.
*   **Collapsing Sidebar**: A responsive, space-saving sidebar in management dashboards.
*   **Standardized UI Components**: Cohesive use of custom buttons, badges, inputs, and pixel-perfect modals.

---

## 🛠️ Technology Stack

*   **Framework**: [React Router 7](https://reactrouter.com/) (Vite-based)
*   **Database & Auth**: [Supabase](https://supabase.com/) (Postgres with RLS)
*   **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
*   **Language**: [TypeScript](https://www.typescriptlang.org/)
*   **Utilities**: `clsx`, `tailwind-merge`, `date-fns`

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   NPM or PNPM
*   A Supabase Project

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-repo/tournament-management-app.git
    cd tournament-management-app
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**:
    Create a `.env` file in the root directory:
    ```env
    VITE_SUPABASE_URL=your_supabase_project_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Run Locally**:
    ```bash
    npm run dev
    ```

### 🧪 Database Seeding
To populate the app with demo data (Inter-Department Championship 2026, events, departments, and members), you can use the built-in seeding tool or run the provided SQL scripts in the Supabase SQL Editor.

---

## 📂 Project Structure

```text
├── app/
│   ├── components/       # Reusable UI (Button, Input, StandingsCard, etc.)
│   ├── layout/           # Page layouts (AdminLayout, etc.)
│   ├── services/         # API integration (Supabase calls)
│   ├── routes/           # Page routes and navigation logic
│   └── lib/              # Utility functions and shared constants
├── public/               # Static assets
└── specs.md              # Detailed technical documentation
```

---

Built with 👾 for the ultimate University Fest Experience.
