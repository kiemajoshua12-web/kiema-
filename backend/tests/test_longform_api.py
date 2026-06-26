"""KIEMA Long-form pipeline tests (iteration 3).
Covers: scene objects (prompt + optional reference_image_b64), global style ref,
light GET payload with has_reference flag, validation, immediate-delete create.
DOES NOT wait for any Sora render — created jobs are deleted right away.
"""
import os
import sys
import json
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://motion-magic-studio.preview.emergentagent.com").rstrip("/")
SESSION_TOKEN = os.environ.get("KIEMA_SESSION_TOKEN")
API = f"{BASE_URL}/api"

# 1x1 transparent PNG
TINY_PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="


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


# --- /api/longform/plan: happy path (small Claude call)
def test_plan_happy_path_returns_3_scenes(auth_headers):
    r = requests.post(f"{API}/longform/plan", headers=auth_headers,
                      json={"brief": "A cat in a hat", "total_duration_s": 24, "clip_duration": 8},
                      timeout=120)
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data.get("scenes"), list)
    assert data.get("count") == 3
    assert data.get("estimated_seconds") == 24
    for s in data["scenes"]:
        assert isinstance(s, str) and len(s) > 5


# --- /api/longform: list & auth gate
def test_list_without_auth_returns_401():
    r = requests.get(f"{API}/longform", timeout=15)
    assert r.status_code == 401


def test_list_returns_items_array_without_scenes_field(auth_headers):
    r = requests.get(f"{API}/longform", headers=auth_headers, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "items" in data and isinstance(data["items"], list)
    for it in data["items"]:
        assert "scenes" not in it, f"list should be light (no scenes), got: {list(it.keys())}"


# --- /api/longform/{id}: get & delete 404s
def test_get_nonexistent_returns_404(auth_headers):
    r = requests.get(f"{API}/longform/lf_does_not_exist_xyz", headers=auth_headers, timeout=15)
    assert r.status_code == 404


def test_delete_nonexistent_returns_404(auth_headers):
    r = requests.delete(f"{API}/longform/lf_does_not_exist_xyz", headers=auth_headers, timeout=15)
    assert r.status_code == 404


# --- /api/longform/create: validation
def test_create_old_string_scenes_returns_422(auth_headers):
    """Old format (scenes as list of strings) must now fail Pydantic validation."""
    r = requests.post(f"{API}/longform/create", headers=auth_headers,
                      json={"title": "TEST_old_fmt", "scenes": ["a scene", "another"], "clip_duration": 8, "size": "1280x720"},
                      timeout=15)
    assert r.status_code == 422, f"expected 422 for old string format, got {r.status_code}: {r.text}"


def test_create_empty_scenes_returns_400(auth_headers):
    r = requests.post(f"{API}/longform/create", headers=auth_headers,
                      json={"title": "TEST_empty", "scenes": [], "clip_duration": 8, "size": "1280x720"},
                      timeout=15)
    assert r.status_code == 400, r.text


def test_create_whitespace_only_scenes_returns_400(auth_headers):
    r = requests.post(f"{API}/longform/create", headers=auth_headers,
                      json={"title": "TEST_ws", "scenes": [{"prompt": "   "}, {"prompt": "\n"}],
                            "clip_duration": 8, "size": "1280x720"},
                      timeout=15)
    assert r.status_code == 400, r.text


def test_create_too_many_scenes_returns_400(auth_headers):
    scenes = [{"prompt": f"scene {i}"} for i in range(201)]
    r = requests.post(f"{API}/longform/create", headers=auth_headers,
                      json={"title": "TEST_too_many", "scenes": scenes, "clip_duration": 8, "size": "1280x720"},
                      timeout=20)
    assert r.status_code == 400, r.text


def test_create_invalid_clip_duration_returns_400(auth_headers):
    r = requests.post(f"{API}/longform/create", headers=auth_headers,
                      json={"title": "TEST_bad_dur", "scenes": [{"prompt": "a scene"}],
                            "clip_duration": 5, "size": "1280x720"},
                      timeout=15)
    assert r.status_code == 400, r.text


def test_create_invalid_size_returns_400(auth_headers):
    r = requests.post(f"{API}/longform/create", headers=auth_headers,
                      json={"title": "TEST_bad_size", "scenes": [{"prompt": "a scene"}],
                            "clip_duration": 8, "size": "foo"},
                      timeout=15)
    assert r.status_code == 400, r.text


# --- /api/longform/create: valid path → IMMEDIATE delete (no Sora wait)
def test_create_with_reference_then_immediate_delete(auth_headers):
    payload = {
        "title": "TEST_create_then_delete",
        "scenes": [{"prompt": "A cat walks across a foggy bridge", "reference_image_b64": TINY_PNG_B64}],
        "clip_duration": 4,
        "size": "1280x720",
        "style_reference_image_b64": TINY_PNG_B64,
    }
    r = requests.post(f"{API}/longform/create", headers=auth_headers, json=payload, timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    job_id = data.get("job_id")
    assert job_id and job_id.startswith("lf_")
    assert data.get("status") == "queued"
    assert data.get("total_clips") == 1
    # response payload must NOT contain heavy base64 fields
    payload_size = len(r.content)
    assert payload_size < 5000, f"response too large ({payload_size}b) — base64 may be leaking"
    assert "style_reference_image_b64" not in data
    for sc in data.get("scenes", []):
        assert "reference_image_b64" not in sc

    # IMMEDIATELY DELETE — do not let Sora run
    dr = requests.delete(f"{API}/longform/{job_id}", headers=auth_headers, timeout=15)
    assert dr.status_code == 200, dr.text
    assert dr.json().get("ok") is True

    # Subsequent GET must 404
    gr = requests.get(f"{API}/longform/{job_id}", headers=auth_headers, timeout=15)
    assert gr.status_code == 404


def test_create_without_style_ref_accepted_then_delete(auth_headers):
    """style_reference_image_b64 is optional — omitting should not error."""
    payload = {
        "title": "TEST_no_style",
        "scenes": [{"prompt": "An empty desert at dawn"}],
        "clip_duration": 4,
        "size": "1280x720",
    }
    r = requests.post(f"{API}/longform/create", headers=auth_headers, json=payload, timeout=20)
    assert r.status_code == 200, r.text
    job_id = r.json().get("job_id")
    assert job_id
    # delete immediately
    requests.delete(f"{API}/longform/{job_id}", headers=auth_headers, timeout=15)


def test_get_returns_light_scenes_with_has_reference(auth_headers):
    """GET /api/longform/{id} returns scenes as {prompt, has_reference} (no base64)."""
    payload = {
        "title": "TEST_light_get",
        "scenes": [
            {"prompt": "Scene A with ref", "reference_image_b64": TINY_PNG_B64},
            {"prompt": "Scene B no ref"},
        ],
        "clip_duration": 4,
        "size": "1280x720",
    }
    r = requests.post(f"{API}/longform/create", headers=auth_headers, json=payload, timeout=20)
    assert r.status_code == 200, r.text
    job_id = r.json()["job_id"]
    try:
        gr = requests.get(f"{API}/longform/{job_id}", headers=auth_headers, timeout=15)
        assert gr.status_code == 200, gr.text
        size = len(gr.content)
        assert size < 5000, f"GET payload too large ({size}b) — base64 leaking"
        body = gr.json()
        assert "style_reference_image_b64" not in body
        scenes = body.get("scenes")
        assert isinstance(scenes, list) and len(scenes) == 2
        assert scenes[0] == {"prompt": "Scene A with ref", "has_reference": True}
        assert scenes[1] == {"prompt": "Scene B no ref", "has_reference": False}
        for sc in scenes:
            assert "reference_image_b64" not in sc
    finally:
        requests.delete(f"{API}/longform/{job_id}", headers=auth_headers, timeout=15)


# --- ffmpeg presence
def test_ffmpeg_callable():
    import subprocess
    p = subprocess.run(["ffmpeg", "-version"], capture_output=True, text=True, timeout=10)
    assert p.returncode == 0
    assert "ffmpeg version" in p.stdout
