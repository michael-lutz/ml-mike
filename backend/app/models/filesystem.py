"""file system data models for the personal website."""

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class FileType(str, Enum):
    """file types supported by the system."""

    FILE = "file"
    DIRECTORY = "directory"
    LINK = "link"


class FileSystemNode(BaseModel):
    """represents a file, directory, or link in the virtual file system."""

    name: str
    path: str
    type: FileType
    content: Optional[str] = None
    target: Optional[str] = None  # for links
    children: List["FileSystemNode"] = []
    metadata: Optional[Dict[str, Any]] = None

    class Config:
        arbitrary_types_allowed = True


class CommandResult(BaseModel):
    """result of a command execution."""

    success: bool
    output: str
    error: Optional[str] = None
    redirect: Optional[str] = None
    clear: Optional[bool] = None
