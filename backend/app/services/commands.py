"""command parsing and execution service."""

import re
from typing import List, Tuple

from ..models.filesystem import CommandResult, FileType
from .filesystem import FileSystemService


class CommandService:
    """parses and executes terminal commands."""

    def __init__(self, fs_service: FileSystemService):
        self.fs_service = fs_service
        self.current_path = "/"

    def execute_command(self, command: str) -> CommandResult:
        """execute a command string and return the result."""
        if not command.strip():
            return CommandResult(success=True, output="")

        parts = self._parse_command(command)
        if not parts:
            return CommandResult(success=False, output="", error="empty command")

        cmd = parts[0].lower()
        args = parts[1:]

        if cmd == "ls":
            return self._execute_ls(args)
        elif cmd == "cd":
            return self._execute_cd(args)
        elif cmd == "cat":
            return self._execute_cat(args)
        elif cmd == "pwd":
            return self._execute_pwd(args)
        elif cmd == "clear":
            return self._execute_clear(args)
        elif cmd == "open":
            return self._execute_open(args)
        elif cmd == "help":
            return self._execute_help(args)
        else:
            return CommandResult(success=False, output="", error=f"command not found: {cmd}")

    def _parse_command(self, command: str) -> List[str]:
        """parse command string into parts, handling quotes."""
        # simple parsing - split on whitespace, but preserve quoted strings
        parts = []
        current = ""
        in_quotes = False
        quote_char = None

        for char in command:
            if char in ['"', "'"] and not in_quotes:
                in_quotes = True
                quote_char = char
            elif char == quote_char and in_quotes:
                in_quotes = False
                quote_char = None
            elif char.isspace() and not in_quotes:
                if current:
                    parts.append(current)
                    current = ""
            else:
                current += char

        if current:
            parts.append(current)

        return parts

    def _execute_ls(self, args: List[str]) -> CommandResult:
        """execute ls command."""
        if len(args) > 1:
            return CommandResult(success=False, output="", error="ls: too many arguments")

        target_path = args[0] if args else self.current_path
        return self.fs_service.list_directory(target_path)

    def _execute_cd(self, args: List[str]) -> CommandResult:
        """execute cd command."""
        if len(args) > 1:
            return CommandResult(success=False, output="", error="cd: too many arguments")

        if not args:
            # cd without args goes to home
            self.current_path = "/"
            return CommandResult(success=True, output="")

        target = args[0]

        if target == "/":
            self.current_path = "/"
            return CommandResult(success=True, output="")

        if target == "..":
            # go up one directory
            if self.current_path == "/":
                return CommandResult(success=True, output="")

            path_parts = [p for p in self.current_path.split("/") if p]
            if path_parts:
                path_parts.pop()
                self.current_path = "/" + "/".join(path_parts) if path_parts else "/"
            return CommandResult(success=True, output="")

        if target.startswith("/"):
            # absolute path
            new_path = target
        else:
            # relative path
            if self.current_path == "/":
                new_path = f"/{target}"
            else:
                new_path = f"{self.current_path}/{target}"

        # check if the target exists and is a directory
        node = self.fs_service.get_node(new_path)
        if not node:
            return CommandResult(success=False, output="", error=f"cd: no such directory: {target}")

        if node.type.value != "directory":
            return CommandResult(success=False, output="", error=f"cd: not a directory: {target}")

        self.current_path = new_path
        return CommandResult(success=True, output="")

    def _execute_cat(self, args: List[str]) -> CommandResult:
        """execute cat command."""
        if not args:
            return CommandResult(success=False, output="", error="cat: missing file operand")

        if len(args) > 1:
            return CommandResult(success=False, output="", error="cat: too many arguments")

        target = args[0]

        if target.startswith("/"):
            # absolute path
            file_path = target
        else:
            # relative path
            if self.current_path == "/":
                file_path = f"/{target}"
            else:
                file_path = f"{self.current_path}/{target}"

        return self.fs_service.read_file(file_path)

    def _execute_pwd(self, args: List[str]) -> CommandResult:
        """execute pwd command."""
        if args:
            return CommandResult(success=False, output="", error="pwd: too many arguments")

        return CommandResult(success=True, output=self.current_path)

    def _execute_clear(self, args: List[str]) -> CommandResult:
        """execute clear command."""
        if args:
            return CommandResult(success=False, output="", error="clear: too many arguments")

        # just return success - frontend will handle clearing
        return CommandResult(success=True, output="")

    def _execute_open(self, args: List[str]) -> CommandResult:
        """execute open command."""
        if not args:
            return CommandResult(success=False, output="", error="open: missing file operand")

        if len(args) > 1:
            return CommandResult(success=False, output="", error="open: too many arguments")

        target = args[0]

        if target.startswith("/"):
            # absolute path
            file_path = target
        else:
            # relative path
            if self.current_path == "/":
                file_path = f"/{target}"
            else:
                file_path = f"{self.current_path}/{target}"

        # check if the file exists
        node = self.fs_service.get_node(file_path)
        if not node:
            return CommandResult(success=False, output="", error=f"open: no such file: {target}")

        if node.type == FileType.LINK:
            return CommandResult(success=True, output="", redirect=node.target)

        if node.type == FileType.BINARY:
            # create a URL to the file serving endpoint
            file_url = f"/api/v1/files/{file_path.lstrip('/')}"
            return CommandResult(success=True, output="", redirect=file_url)

        # for regular files, just read them like cat
        return self.fs_service.read_file(file_path)

    def _execute_help(self, args: List[str]) -> CommandResult:
        """execute help command."""
        help_text = """available commands:

ls [directory]     - list directory contents
cd [directory]     - change directory
cat [file]         - display file contents
pwd                - print working directory
clear              - clear the terminal
open [file]        - open file (same as cat, but for links will redirect)
help               - show this help message

file types:
  /                - directory
  .md              - markdown file (view with cat)
  .txt             - regular file (view with cat)
  .html            - html file (view with open)
  .jpg/.png/etc    - image file (view with open)
  (no suffix)      - linked file (view with open)

examples:
  ls               - list current directory
  cd projects      - enter projects directory
  cat about.md     - view about file
  open ksim        - open ksim project link
  clear            - clear terminal
  pwd              - show current path
"""
        return CommandResult(success=True, output=help_text)

    def get_prompt(self) -> str:
        """get the current command prompt."""
        return f"michael:{self.current_path}$ "
