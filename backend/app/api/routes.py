"""api routes for the command prompt interface."""

from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..services import CommandService, FileSystemService

router = APIRouter()

# initialize services
fs_service = FileSystemService()
cmd_service = CommandService(fs_service)


class CommandRequest(BaseModel):
    """request model for command execution."""

    command: str
    session_id: Optional[str] = None


class CommandResponse(BaseModel):
    """response model for command execution."""

    success: bool
    output: str
    error: Optional[str] = None
    redirect: Optional[str] = None
    prompt: str


@router.post("/execute", response_model=CommandResponse)
async def execute_command(request: CommandRequest):
    """execute a command and return the result."""
    try:
        result = cmd_service.execute_command(request.command)

        # handle redirects for links
        if result.redirect:
            return CommandResponse(success=True, output="", redirect=result.redirect, prompt=cmd_service.get_prompt())

        return CommandResponse(
            success=result.success, output=result.output, error=result.error, prompt=cmd_service.get_prompt()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/prompt")
async def get_prompt():
    """get the current command prompt."""
    return {"prompt": cmd_service.get_prompt()}


@router.get("/health")
async def health_check():
    """health check endpoint."""
    return {"status": "healthy", "message": "mlmike personal website api is running"}
