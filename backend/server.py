"""KIEMA Editing App backend - AI creative studio.

Endpoints:
  - Auth (Emergent Google): /api/auth/session, /api/auth/me, /api/auth/logout
  - Generations: /api/generate/image, /api/generate/video, /api/generations, /api/generations/{id}
  - Media: /api/media/video/{id}
"""
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, UploadFile, File, Form
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import base64
import logging
import asyncio
import uuid
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from pydantic import BaseModel, Field

import httpx
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent
from emergentintegrations.llm.openai.video_generation import OpenAIVideoGeneration


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

STORAGE_DIR = ROOT_DIR / "storage"
VIDEO_DIR = STORAGE_DIR / "videos"
VIDEO_DIR.mkdir(parents=True, exist_ok=True)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
SESSION_DATA_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

app = FastAPI(title="KIEMA Backend")
api_router = APIRouter(prefix="/api")

logger = logging.getLogger("kiema")
logging.basicConfig(level=logging.INFO)


# ---------- Models ----------
class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Generation(BaseModel):
    id: str
    user_id: str
    kind: str  # "image" | "video"
    prompt: str
    style: Optional[str] = None
    aspect_ratio: Optional[str] = None
    duration: Optional[int] = None
    size: Optional[str] = None
    image_data_url: Optional[str] = None  # data url for images
    video_id: Optional[str] = None  # references file id stored on disk
    thumbnail_data_url: Optional[str] = None
    created_at: datetime


class ImageGenRequest(BaseModel):
    prompt: str
    style: Optional[str] = "cinematic"
    aspect_ratio: Optional[str] = "16:9"
    reference_image_b64: Optional[str] = None  # raw base64 without data: prefix


class VideoGenRequest(BaseModel):
    prompt: str
    size: Optional[str] = "1280x720"
    duration: Optional[int] = 4
    model: Optional[str] = "sora-2"


# ---------- Auth helpers ----------
async def get_current_user(request: Request) -> User:
    """Resolve current user from session_token cookie or Authorization header."""
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")

    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")

    user_doc = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    if isinstance(user_doc.get("created_at"), str):
        user_doc["created_at"] = datetime.fromisoformat(user_doc["created_at"])
    return User(**user_doc)


# ---------- Auth endpoints ----------
@api_router.post("/auth/session")
async def auth_session(request: Request, response: Response):
    """Exchange session_id (from Emergent OAuth redirect) for a session cookie."""
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")

    async with httpx.AsyncClient(timeout=20) as http:
        r = await http.get(SESSION_DATA_URL, headers={"X-Session-ID": session_id})
        if r.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session_id")
        data = r.json()

    email = data["email"]
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data["name"], "picture": data.get("picture")}}
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": data["name"],
            "picture": data.get("picture"),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    session_token = data["session_token"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=7 * 24 * 60 * 60,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )
    return {
        "user_id": user_id,
        "email": email,
        "name": data["name"],
        "picture": data.get("picture"),
    }


@api_router.get("/auth/me")
async def auth_me(request: Request):
    user = await get_current_user(request)
    return user.model_dump()


@api_router.post("/auth/logout")
async def auth_logout(request: Request, response: Response):
    token = request.cookies.get("session_token") or ""
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


# ---------- Generation: Image (Gemini Nano Banana) ----------
def _aspect_hint(ar: str) -> str:
    hints = {
        "16:9": "cinematic widescreen 16:9 composition",
        "9:16": "vertical portrait 9:16 composition for mobile/story",
        "1:1": "perfectly square 1:1 composition",
        "4:5": "portrait 4:5 social composition",
        "21:9": "ultra-wide cinematic 21:9 composition",
    }
    return hints.get(ar, "cinematic widescreen composition")


@api_router.post("/generate/image")
async def generate_image(req: ImageGenRequest, request: Request):
    user = await get_current_user(request)
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")

    style_block = f", style: {req.style}" if req.style else ""
    ar_block = f", {_aspect_hint(req.aspect_ratio or '16:9')}"
    full_prompt = (
        f"{req.prompt}{style_block}{ar_block}. "
        f"Render at ultra-high 4K quality, professional lighting, sharp focus."
    )

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"img_{uuid.uuid4().hex[:10]}",
        system_message="You are an expert creative image generator producing 4K cinematic visuals.",
    )
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])

    file_contents = None
    if req.reference_image_b64:
        file_contents = [ImageContent(req.reference_image_b64)]

    msg = UserMessage(text=full_prompt, file_contents=file_contents)

    try:
        text, images = await chat.send_message_multimodal_response(msg)
    except Exception as e:
        logger.exception("Image generation failed")
        raise HTTPException(status_code=502, detail=f"Generation failed: {e}")

    if not images:
        raise HTTPException(status_code=502, detail="No image returned")

    img = images[0]
    data_url = f"data:{img['mime_type']};base64,{img['data']}"
    gen_id = f"gen_{uuid.uuid4().hex[:12]}"
    doc = {
        "id": gen_id,
        "user_id": user.user_id,
        "kind": "image",
        "prompt": req.prompt,
        "style": req.style,
        "aspect_ratio": req.aspect_ratio,
        "image_data_url": data_url,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.generations.insert_one(doc)
    doc.pop("_id", None)
    return doc


# ---------- Generation: Video (Sora 2) ----------
def _run_sora(prompt: str, size: str, duration: int, model: str, out_path: Path) -> Optional[Path]:
    gen = OpenAIVideoGeneration(api_key=EMERGENT_LLM_KEY)
    video_bytes = gen.text_to_video(
        prompt=prompt,
        model=model,
        size=size,
        duration=duration,
        max_wait_time=900,
    )
    if not video_bytes:
        return None
    gen.save_video(video_bytes, str(out_path))
    return out_path


@api_router.post("/generate/video")
async def generate_video(req: VideoGenRequest, request: Request):
    user = await get_current_user(request)
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")
    if req.duration not in (4, 8, 12):
        raise HTTPException(status_code=400, detail="duration must be 4, 8 or 12")
    if req.size not in ("1280x720", "1792x1024", "1024x1792", "1024x1024"):
        raise HTTPException(status_code=400, detail="invalid size")

    video_id = f"vid_{uuid.uuid4().hex[:12]}"
    out_path = VIDEO_DIR / f"{video_id}.mp4"

    try:
        result = await asyncio.to_thread(
            _run_sora, req.prompt, req.size, req.duration, req.model or "sora-2", out_path
        )
    except Exception as e:
        logger.exception("Sora 2 video generation failed")
        raise HTTPException(status_code=502, detail=f"Video generation failed: {e}")

    if not result:
        raise HTTPException(status_code=502, detail="No video produced")

    gen_id = f"gen_{uuid.uuid4().hex[:12]}"
    doc = {
        "id": gen_id,
        "user_id": user.user_id,
        "kind": "video",
        "prompt": req.prompt,
        "size": req.size,
        "duration": req.duration,
        "video_id": video_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.generations.insert_one(doc)
    doc.pop("_id", None)
    return doc


# ---------- Gallery ----------
@api_router.get("/generations")
async def list_generations(request: Request, kind: Optional[str] = None):
    user = await get_current_user(request)
    q = {"user_id": user.user_id}
    if kind:
        q["kind"] = kind
    cursor = db.generations.find(q, {"_id": 0}).sort("created_at", -1).limit(200)
    items = await cursor.to_list(200)
    return {"items": items}


@api_router.delete("/generations/{gen_id}")
async def delete_generation(gen_id: str, request: Request):
    user = await get_current_user(request)
    doc = await db.generations.find_one({"id": gen_id, "user_id": user.user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    if doc.get("kind") == "video" and doc.get("video_id"):
        p = VIDEO_DIR / f"{doc['video_id']}.mp4"
        if p.exists():
            p.unlink(missing_ok=True)
    await db.generations.delete_one({"id": gen_id, "user_id": user.user_id})
    return {"ok": True}


# ---------- Media serving ----------
@api_router.get("/media/video/{video_id}")
async def get_video(video_id: str):
    p = VIDEO_DIR / f"{video_id}.mp4"
    if not p.exists():
        raise HTTPException(status_code=404, detail="Video not found")
    return FileResponse(str(p), media_type="video/mp4", filename=f"{video_id}.mp4")


# ---------- Health ----------
@api_router.get("/")
async def root():
    return {"app": "KIEMA", "status": "ok"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
