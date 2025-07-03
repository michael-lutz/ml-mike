# mlmike - Personal Website

A command prompt style personal website built with FastAPI and React. Navigate through the site using familiar terminal commands like `ls`, `cd`, and `cat`.

## Features

- **Command Prompt Interface**: Navigate using real terminal commands
- **File System Simulation**: Virtual file system with files, directories, and links
- **Markdown Support**: Content files are rendered as HTML with syntax highlighting
- **Link Support**: External links that redirect when accessed
- **Command History**: Use arrow keys to navigate through command history
- **Responsive Design**: Works on desktop and mobile devices

## Commands Available

- `ls [directory]` - List directory contents
- `cd [directory]` - Change directory
- `cat <file>` - Display file contents
- `pwd` - Print working directory
- `help` - Show help message

## File Types

- `/` - Directory
- `@` - Link (will redirect when accessed)
- (no suffix) - Regular file

## Quick Start

### Using Docker (Recommended)

1. Clone the repository:
```bash
git clone <your-repo-url>
cd mlmike
```

2. Start the services:
```bash
docker-compose up --build
```

3. Open your browser and navigate to `http://localhost:3000`

### Manual Setup

#### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Start the backend server:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

## Content Management

The website content is stored in the `backend/content/` directory. The system automatically creates a default structure if none exists:

```
content/
├── about.txt          # About page content
├── projects/          # Projects directory
│   └── project1.md    # Project files (markdown)
└── links/             # External links
    ├── github         # GitHub profile link
    └── linkedin       # LinkedIn profile link
```

### Adding Content

1. **Regular Files**: Create `.txt` or `.md` files in the content directory
2. **Markdown Files**: Use `.md` extension for rich formatting
3. **Links**: Create files containing URLs (starting with `http`) in the `links/` directory
4. **Directories**: Create folders to organize your content

### Example Content Structure

```
content/
├── about.txt
├── resume.md
├── blog/
│   ├── post1.md
│   └── post2.md
├── projects/
│   ├── project1.md
│   └── project2.md
└── links/
    ├── github
    ├── linkedin
    └── twitter
```

## Development

### Backend Development

The backend is built with FastAPI and provides:

- RESTful API endpoints for command execution
- File system abstraction layer
- Markdown to HTML conversion
- Link resolution and redirects

Key files:
- `app/main.py` - FastAPI application entry point
- `app/services/filesystem.py` - File system management
- `app/services/commands.py` - Command parsing and execution
- `app/api/routes.py` - API endpoints

### Frontend Development

The frontend is built with React and provides:

- Terminal emulator interface
- Command history navigation
- Real-time command execution
- Responsive design

Key files:
- `src/components/Terminal.jsx` - Main terminal component
- `src/services/api.js` - API communication
- `src/index.css` - Terminal styling

## API Endpoints

- `POST /api/v1/execute` - Execute a command
- `GET /api/v1/prompt` - Get current prompt
- `GET /api/v1/health` - Health check
- `GET /docs` - API documentation (Swagger UI)

## Deployment

### Docker Deployment

1. Build and run with Docker Compose:
```bash
docker-compose up --build -d
```

2. Access the application at `http://localhost:3000`

### Manual Deployment

1. Build the frontend:
```bash
cd frontend
npm run build
```

2. Serve the backend with a production WSGI server:
```bash
cd backend
pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

3. Serve the frontend build files with a web server like nginx

## Customization

### Styling

Modify `frontend/src/index.css` to customize the terminal appearance:

- Terminal colors and fonts
- Markdown content styling
- Cursor animation
- Scrollbar appearance

### Adding New Commands

1. Add command logic in `backend/app/services/commands.py`
2. Update the help text in the `_execute_help` method
3. Test the new command functionality

### Adding HTML Page Support

To support direct HTML pages (future feature):

1. Modify the file system service to detect `.html` files
2. Update the read_file method to serve HTML content directly
3. Add HTML file handling in the frontend

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

If you encounter any issues or have questions, please open an issue on GitHub. 