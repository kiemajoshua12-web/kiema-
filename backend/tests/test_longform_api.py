"""KIEMA Long-form pipeline tests: /api/longform/plan, /create, list, get, delete.
Does NOT trigger real Sora renders — only validation paths + a small Claude plan call.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://motion-magic-studio.preview.emergentagent.com").rstrip("/")
SESSION_TOKEN = os.environ.get("KIEMA_SESSION_TOKEN")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def auth_headers():
    assert SESSION_TOKEN, "KIEMA_SESSION_TOKEN env required"
    return {"Authorization": f"Bearer {SESSION_TOKEN}", "Content-Type": "application/json"}


# --- /api/longform/plan: validation
def test_plan_invalid_clip_duration_returns_400(auth_headers):
    r = requests.post(f"{API}/longform/plan", headers=auth_headers,
                      json={"brief": "A cat in a hat", "total_duration_s": 24, "clip_duration": 5},
                      timeout=15)
    assert r.status_code == 400, r.text


def test_plan_total_duration_too_large_returns_400(auth_headers):
    r = requests.post(f"{API}/longform/plan", headers=auth_headers,
                      json={"brief": "x", "total_duration_s": 1801, "clip_duration": 8},
                      timeout=15)
    assert r.status_code == 400, r.text


def test_plan_total_duration_zero_returns_400(auth_headers):
    r = requests.post(f"{API}/longform/plan", headers=auth_headers,
                      json={"brief": "x", "total_duration_s": 0, "clip_duration": 8},
                      timeout=15)
    assert r.status_code == 400, r.text


def test_plan_negative_total_duration_returns_400(auth_headers):
    r = requests.post(f"{API}/longform/plan", headers=auth_headers,
                      json={"brief": "x", "total_duration_s": -5, "clip_duration": 8},
                      timeout=15)
    assert r.status_code == 400, r.text


# --- /api/longform/plan: happy path (real Claude call, but small — 3 scenes)
def test_plan_happy_path_returns_3_scenes(auth_headers):
    r = requests.post(f"{API}/longform/plan", headers=auth_headers,
                      json={"brief": "A cat in a hat", "total_duration_s": 24, "clip_duration": 8},
                      timeout=120)
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data.get("scenes"), list)
    assert data.get("count") == 3, f"expected 3 scenes, got {data.get('count')}; scenes={data.get('scenes')}"
    assert len(data["scenes"]) == 3
    assert data.get("estimated_seconds") == 24
    for s in data["scenes"]:
        assert isinstance(s, str) and len(s) > 5


# --- /api/longform: list & auth gate
def test_list_without_auth_returns_401():
    r = requests.get(f"{API}/longform", timeout=15)
    assert r.status_code == 401


def test_list_returns_items_array(auth_headers):
    r = requests.get(f"{API}/longform", headers=auth_headers, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "items" in data
    assert isinstance(data["items"], list)


# --- /api/longform/{id}: get & delete 404s
def test_get_nonexistent_returns_404(auth_headers):
    r = requests.get(f"{API}/longform/lf_does_not_exist_xyz", headers=auth_headers, timeout=15)
    assert r.status_code == 404


def test_delete_nonexistent_returns_404(auth_headers):
    r = requests.delete(f"{API}/longform/lf_does_not_exist_xyz", headers=auth_headers, timeout=15)
    assert r.status_code == 404


# --- /api/longform/create: validation only (DO NOT submit valid scenes — would trigger Sora)
def test_create_empty_scenes_returns_400(auth_headers):
    r = requests.post(f"{API}/longform/create", headers=auth_headers,
                      json={"title": "TEST_empty", "scenes": [], "clip_duration": 8, "size": "1280x720"},
                      timeout=15)
    assert r.status_code == 400, r.text


def test_create_too_many_scenes_returns_400(auth_headers):
    scenes = [f"scene {i}" for i in range(201)]
    r = requests.post(f"{API}/longform/create", headers=auth_headers,
                      json={"title": "TEST_too_many", "scenes": scenes, "clip_duration": 8, "size": "1280x720"},
                      timeout=15)
    assert r.status_code == 400, r.text


def test_create_invalid_clip_duration_returns_400(auth_headers):
    r = requests.post(f"{API}/longform/create", headers=auth_headers,
                      json={"title": "TEST_bad_dur", "scenes": ["a scene"], "clip_duration": 5, "size": "1280x720"},
                      timeout=15)
    assert r.status_code == 400, r.text


def test_create_invalid_size_returns_400(auth_headers):
    r = requests.post(f"{API}/longform/create", headers=auth_headers,
                      json={"title": "TEST_bad_size", "scenes": ["a scene"], "clip_duration": 8, "size": "foo"},
                      timeout=15)
    assert r.status_code == 400, r.text


def test_create_whitespace_only_scenes_returns_400(auth_headers):
    r = requests.post(f"{API}/longform/create", headers=auth_headers,
                      json={"title": "TEST_ws", "scenes": ["   ", "\n"], "clip_duration": 8, "size": "1280x720"},
                      timeout=15)
    assert r.status_code == 400, r.text


# --- ffmpeg presence
def test_ffmpeg_callable():
    import subprocess
    p = subprocess.run(["ffmpeg", "-version"], capture_output=True, text=True, timeout=10)
    assert p.returncode == 0
    assert "ffmpeg version" in p.stdout
