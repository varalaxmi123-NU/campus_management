import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api";
// The backend host without the "/api" suffix - needed to build links to
// uploaded files (resumes, logos, etc.) served from /uploads on the backend.
export const SERVER_URL = API_BASE_URL.replace(/\/api\/?$/, "");

// Turns a resume/file value into a URL that always points at the backend.
// - Files uploaded through our own multer endpoint are stored as relative
//   paths like "/uploads/resumes/xyz.pdf" and must be prefixed with the
//   backend origin, or the browser tries to load them from the frontend's
//   own origin (e.g. http://localhost:5173/uploads/...) and 404s.
// - External links (Google Drive, Dropbox, etc.) already have a full URL
//   and are returned as-is.
export const resolveFileUrl = (link) => {
  if (!link) return "";
  if (link.startsWith("/uploads")) return `${SERVER_URL}${link}`;
  return link;
};

const API = axios.create({
  baseURL: API_BASE_URL,
});

// Attach the saved token to every request automatically (if present)
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;
