# AZ-VibeAudit

Azure Security Benchmark Analyzer - A tool for analyzing Azure security benchmarks and controls.

## Prerequisites

- Node.js v20.9.0 or higher
- npm (comes with Node.js)
- Python 3.x (for backend)

## Installation

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd Frontend
```

2. Install dependencies with legacy peer deps (required due to some package version conflicts):
```bash
npm install --legacy-peer-deps
```

3. Start the development server:
```bash
npm run dev
```

The frontend will be available at http://localhost:3000

### Backend Setup

1. Navigate to the backend directory:
```bash
cd Backend
```

2. Create and activate a virtual environment:
```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# Linux/Mac
python -m venv .venv
source .venv/bin/activate
```

3. Install Python dependencies (IMPORTANT: This step is required for the backend to function properly):
```bash
pip install -r requirements.txt
```

4. Start the backend server:
```bash
python app.py
```

## Project Structure

- `Frontend/` - Next.js application
  - `app/` - Next.js app directory
  - `components/` - React components
  - `lib/` - Utility functions and API calls
- `Backend/` - Python FastAPI application
- `Benchmark-Files/` - Sample benchmark files and templates

## Troubleshooting

If you encounter the "invariant expected layout router to be mounted" error:

1. Clear the Next.js cache and node_modules:
```bash
cd Frontend
rm -rf .next
rm -rf node_modules
```

2. Reinstall dependencies:
```bash
npm install --legacy-peer-deps
```

3. Restart the development server:
```bash
npm run dev
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request