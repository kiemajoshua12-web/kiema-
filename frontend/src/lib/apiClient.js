import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
});

export const auth = {
  me: () => api.get("/auth/me").then(r => r.data),
  exchange: (session_id) => api.post("/auth/session", { session_id }).then(r => r.data),
  logout: () => api.post("/auth/logout").then(r => r.data),
};

export const generations = {
  list: (kind) => api.get("/generations", { params: kind ? { kind } : {} }).then(r => r.data),
  remove: (id) => api.delete(`/generations/${id}`).then(r => r.data),
  image: (payload) => api.post("/generate/image", payload).then(r => r.data),
  video: (payload) => api.post("/generate/video", payload).then(r => r.data),
};

export const videoUrl = (video_id) => `${API}/media/video/${video_id}`;
