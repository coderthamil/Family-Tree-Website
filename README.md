# Family Tree Website

A full-stack genealogy platform with:
- **Backend**: FastAPI + SQLAlchemy (async) + PostgreSQL
- **Frontend**: React + Vite + TailwindCSS + D3.js
- **Auth**: JWT-based with Admin / Contributor / Viewer roles

## Quick Start (Local Development)

### 1. Prerequisites
- Python 3.11+
- Node.js 22+
- PostgreSQL running locally (or Docker)

### 2. Backend Setup

```bash
cd backend
pip install -r requirements.txt

# Configure environment
cp ../.env.example ../.env
# Edit .env with your DB credentials

# Run migrations
alembic upgrade head

# Seed default admin user
python -m app.seed

# Start the API server
uvicorn app.main:app --reload --port 8000
```

**Default admin credentials**: `admin` / `Admin@1234`

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: **http://localhost:5173**  
API Docs (dark Swagger): **http://localhost:8000/docs**

### 4. Docker Compose (All Services)

```bash
docker-compose up --build -d
```

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app + Swagger dark theme
│   │   ├── models/          # ORM: Person, Family, Children, Timeline, User
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── routes/          # auth, persons, families, tree, import, relationships, timeline, export
│   │   ├── services/        # parser, importer, relationship, id_generator, storage, tree_builder
│   │   ├── auth/            # JWT, bcrypt, role guards
│   │   └── admin/           # dashboard stats
│   ├── alembic/             # DB migrations
│   └── tests/               # pytest tests
└── frontend/
    └── src/
        ├── pages/           # Login, Tree, Profile, Share, Admin pages
        ├── components/      # FamilyTree (D3), ProfileCard, TimelineView, PersonAvatar
        ├── api/             # Axios client
        └── store/           # Zustand auth store
```

## Features

| Feature | Status | Description |
|---|---|---|
| GenoPro HTM/XML Import | ✅ | Robust XML parsing for GenoPro `.gno`/`.ged`/`.xml` files (PedigreeLink schemas resolved). |
| D3 Interactive Family Tree | ✅ | Zoomable, pannable, and expandable tree layout built using D3.js. |
| Side-by-Side Spouse Layout | ✅ | Renders married couples (father & mother) side-by-side connected via a dashed union line and ring icon. |
| Glowing Square Cards | ✅ | Sized-up `240x100` card design with modern square themes (`rx=4`), left-border gender stripes, and drop-shadow glow transitions. |
| Square Profile Avatars | ✅ | Crop profile photos into a clean square with rounded corners (`rx=8`) using local SVG clip-paths, with fallback initials. |
| Autocomplete Search Bar | ✅ | Easily look up any of the tree individuals in real-time, instantly centering the family tree root on them. |
| Inline Profile Editing | ✅ | Edit person details and upload photos directly within the sidebar drawer, triggering automatic tree refreshes. |
| Profile Picture Upload | ✅ | Admin/Contributors can upload profile photos directly via local storage or AWS S3. |
| Extended Relationships | ✅ | Dynamic query of relatives (spouses, parents, siblings, aunts/uncles, cousins, grandp.). |
| Timeline View | ✅ | Visual timeline showing life events (birth, marriage, migration, death) chronologically. |
| PDF Export & Link Share | ✅ | Exposes tree rendering to download as a high-quality PDF or share via access tokens. |
| Dark/Light Theme | ✅ | Smooth toggling between custom HSL colors and glassmorphism styling. |
| Role-Based Access | ✅ | View, edit, delete, and import permissions handled via JWT. |
| Swagger Dark Theme | ✅ | Styled FastAPI docs interface matching the theme. |

## Roles

| Role | Can View | Can Edit | Can Delete | Can Import | Can Admin |
|---|---|---|---|---|---|
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| Contributor | ✅ | ✅ | ❌ | ❌ | ❌ |
| Viewer | ✅ | ❌ | ❌ | ❌ | ❌ |
