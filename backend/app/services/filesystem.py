"""file system service for managing the virtual file system."""

import os
from pathlib import Path
from typing import Any, Dict, List, Optional

import markdown

from ..models.filesystem import CommandResult, FileSystemNode, FileType


class FileSystemService:
    """manages the virtual file system for the personal website."""

    def __init__(self, content_dir: str = "content"):
        self.content_dir = Path(content_dir)
        self.root = self._build_file_system()

    def _build_file_system(self) -> FileSystemNode:
        """build the virtual file system from the content directory."""
        root = FileSystemNode(name="root", path="/", type=FileType.DIRECTORY, children=[])

        if not self.content_dir.exists():
            self._create_default_content()

        self._load_directory(self.content_dir, root)
        return root

    def _create_default_content(self):
        """create default content structure if it doesn't exist."""
        self.content_dir.mkdir(parents=True, exist_ok=True)

        # create about file
        about_content = """# about me

welcome to my personal website! i'm a developer who loves building cool things.

## skills
- python
- javascript
- web development
- command line interfaces

## contact
feel free to reach out if you want to collaborate on something interesting.
"""
        (self.content_dir / "about.txt").write_text(about_content)

        # create projects directory
        projects_dir = self.content_dir / "projects"
        projects_dir.mkdir(exist_ok=True)

        project1_content = """# project 1

this is a cool project i built. it does amazing things.

## features
- feature 1
- feature 2
- feature 3

## tech stack
- python
- fastapi
- react
"""
        (projects_dir / "project1.md").write_text(project1_content)

        # create links directory
        links_dir = self.content_dir / "links"
        links_dir.mkdir(exist_ok=True)

        # create link files (these will be handled specially)
        (links_dir / "github").write_text("https://github.com/yourusername")
        (links_dir / "linkedin").write_text("https://linkedin.com/in/yourusername")

    def _load_directory(self, dir_path: Path, parent_node: FileSystemNode):
        """recursively load a directory into the file system."""
        for item in dir_path.iterdir():
            if item.name.startswith("."):
                continue

            node = FileSystemNode(
                name=item.name,
                path=str(item.relative_to(self.content_dir)),
                type=FileType.DIRECTORY if item.is_dir() else FileType.FILE,
                children=[] if item.is_dir() else [],
            )

            if item.is_file():
                # check if it's a binary file (image, etc.)
                if self._is_binary_file(item):
                    node.type = FileType.BINARY
                    node.content = None
                else:
                    # check if it's a link file
                    try:
                        content = item.read_text().strip()
                        if content.startswith("http"):
                            node.type = FileType.LINK
                            node.target = content
                        else:
                            node.content = content
                    except UnicodeDecodeError:
                        # if we can't decode as text, treat as binary
                        node.type = FileType.BINARY
                        node.content = None

            if item.is_dir():
                self._load_directory(item, node)

            parent_node.children.append(node)

    def get_node(self, path: str) -> Optional[FileSystemNode]:
        """get a file system node by path."""
        if path == "/" or path == "":
            return self.root

        path_parts = [p for p in path.split("/") if p]
        current = self.root

        for part in path_parts:
            if not current.children:
                return None

            found = None
            for child in current.children:
                if child.name == part:
                    found = child
                    break

            if not found:
                return None

            current = found

        return current

    def list_directory(self, path: str = "/") -> CommandResult:
        """list contents of a directory."""
        node = self.get_node(path)

        if not node:
            return CommandResult(success=False, output="", error=f"directory not found: {path}")

        if node.type != FileType.DIRECTORY:
            return CommandResult(success=False, output="", error=f"not a directory: {path}")

        if not node.children:
            output = "directory is empty"
        else:
            # format output like ls
            items = []
            for child in node.children:
                if child.type == FileType.DIRECTORY:
                    items.append(f"{child.name}/")
                else:
                    items.append(child.name)

            output = "  ".join(items)

        return CommandResult(success=True, output=output)

    def read_file(self, path: str) -> CommandResult:
        """read contents of a file."""
        node = self.get_node(path)

        if not node:
            return CommandResult(success=False, output="", error=f"file not found: {path}")

        if node.type == FileType.LINK:
            return CommandResult(success=True, output="", redirect=node.target)

        if node.type == FileType.DIRECTORY:
            return CommandResult(success=False, output="", error=f"is a directory: {path}")

        if node.type == FileType.BINARY:
            return CommandResult(success=False, output="", error=f"binary file: {path} (use 'open' to view)")

        if not node.content:
            return CommandResult(success=False, output="", error=f"file is empty: {path}")

        # convert markdown to html if it's a markdown file
        if path.endswith(".md"):
            # convert relative image paths to absolute URLs
            import re

            content = node.content

            # replace relative image paths with absolute URLs
            def replace_image_path(match):
                alt_text = match.group(1)  # text inside square brackets
                img_path = match.group(2)  # path inside parentheses
                if img_path.startswith("./"):
                    img_path = img_path[2:]  # remove ./
                elif img_path.startswith("/"):
                    img_path = img_path[1:]  # remove leading /

                # construct the full URL
                return f'<img src="/api/v1/files/{img_path}" alt="{alt_text}" style="max-width: 100%; height: auto;">'

            # replace markdown image syntax with HTML img tags
            content = re.sub(r"!\[([^\]]*)\]\(([^)]+)\)", replace_image_path, content)

            # convert the rest to HTML
            html_content = markdown.markdown(content)
            return CommandResult(success=True, output=html_content)

        return CommandResult(success=True, output=node.content)

    def _is_binary_file(self, file_path: Path) -> bool:
        """check if a file is binary based on its extension."""
        binary_extensions = {
            ".jpg",
            ".jpeg",
            ".png",
            ".gif",
            ".bmp",
            ".tiff",
            ".webp",
            ".pdf",
            ".zip",
            ".tar",
            ".gz",
            ".rar",
            ".7z",
            ".mp3",
            ".mp4",
            ".avi",
            ".mov",
            ".wav",
            ".flac",
            ".exe",
            ".dll",
            ".so",
            ".dylib",
        }
        return file_path.suffix.lower() in binary_extensions

    def get_current_path(self, path: str) -> str:
        """get the current working directory path."""
        if path == "/" or path == "":
            return "/"
        return f"/{path}"
