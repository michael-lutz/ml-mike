"""main fastapi application for the personal website."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .api import router

app = FastAPI(title="cmd michael", description="a command prompt style personal website", version="1.0.0")

# add cors middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # in production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# include api routes
app.include_router(router, prefix="/api/v1")

# TODO fix... this is a hack to serve the frontend static files
app.mount("/", StaticFiles(directory="app/static", html=True), name="static")


@app.get("/")
async def root():
    """root endpoint."""
    return {
        "message": "welcome to michael lutz's personal website",
        "api_docs": "/docs",
        "description": "this is a command prompt style personal website",
    }
