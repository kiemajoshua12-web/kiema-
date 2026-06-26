"""KIEMA backend tests: health, auth, image generation (Gemini Nano Banana), gallery."""
import os
import base64
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://motion-magic-studio.preview.emergentagent.com").rstrip("/")
SESSION_TOKEN = os.environ.get("KIEMA_SESSION_TOKEN", "TEST_session_1782463465417")
API = f"{BASE_URL}/api"

# Tiny 1x1 PNG (transparent)
TINY_PNG_B64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
)


@pytest.fixture(scope="module")
def auth_headers():
    return {"Authorization": f"Bearer {SESSION_TOKEN}", "Content-Type": "application/json"}


# --- Health
def test_root_status_ok():
    r = requests.get(f"{API}/", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data.get("status") == "ok"
    assert data.get("app") == "KIEMA"


# --- Auth
def test_auth_me_without_token_returns_401():
    r = requests.get(f"{API}/auth/me", timeout=15)
    assert r.status_code == 401


def test_auth_me_with_token_returns_user(auth_headers):
    r = requests.get(f"{API}/auth/me", headers=auth_headers, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "user_id" in data and "email" in data and "name" in data
    assert data["name"] == "Test User"


# --- Video endpoint validation only (no real call)
def test_video_invalid_duration_returns_400(auth_headers):
    r = requests.post(
        f"{API}/generate/video",
        headers=auth_headers,
        json={"prompt": "test", "size": "1280x720", "duration": 7, "model": "sora-2"},
        timeout=15,
    )
    assert r.status_code == 400


# --- Image generation (REAL LLM call — slow & expensive). Run once.
@pytest.fixture(scope="module")
def generated_image(auth_headers):
    payload = {
        "prompt": "A neon-lit city skyline at night, cinematic 4K",
        "style": "cinematic",
        "aspect_ratio": "16:9",
    }
    r = requests.post(f"{API}/generate/image", headers=auth_headers, json=payload, timeout=180)
    assert r.status_code == 200, f"Image gen failed: {r.status_code} {r.text}"
    data = r.json()
    assert data.get("id", "").startswith("gen_")
    assert data.get("kind") == "image"
    assert data.get("image_data_url", "").startswith("data:image/")
    return data


def test_image_generation_creates_record(generated_image):
    assert generated_image["prompt"].startswith("A neon-lit city skyline")


def test_list_generations_includes_new_image(auth_headers, generated_image):
    r = requests.get(f"{API}/generations", headers=auth_headers, timeout=20)
    assert r.status_code == 200
    items = r.json().get("items", [])
    ids = [i["id"] for i in items]
    assert generated_image["id"] in ids


def test_list_generations_filter_image_only(auth_headers, generated_image):
    r = requests.get(f"{API}/generations", headers=auth_headers, params={"kind": "image"}, timeout=20)
    assert r.status_code == 200
    items = r.json().get("items", [])
    assert all(i.get("kind") == "image" for i in items)
    assert generated_image["id"] in [i["id"] for i in items]


def test_image_generation_with_reference(auth_headers):
    payload = {
        "prompt": "A surreal floating island, cinematic",
        "style": "cinematic",
        "aspect_ratio": "1:1",
        "reference_image_b64": TINY_PNG_B64,
    }
    r = requests.post(f"{API}/generate/image", headers=auth_headers, json=payload, timeout=180)
    assert r.status_code == 200, f"Ref image gen failed: {r.status_code} {r.text}"
    data = r.json()
    assert data.get("kind") == "image"
    assert data.get("image_data_url", "").startswith("data:image/")
    # cleanup
    requests.delete(f"{API}/generations/{data['id']}", headers=auth_headers, timeout=15)


def test_delete_generation_removes_it(auth_headers, generated_image):
    gid = generated_image["id"]
    r = requests.delete(f"{API}/generations/{gid}", headers=auth_headers, timeout=15)
    assert r.status_code == 200
    # verify gone
    r2 = requests.get(f"{API}/generations", headers=auth_headers, timeout=20)
    ids = [i["id"] for i in r2.json().get("items", [])]
    assert gid not in ids
