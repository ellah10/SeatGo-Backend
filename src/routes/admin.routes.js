import { Router } from "express";
import { adminLogin } from "../controllers/admin.auth.controller.js";
import { getAdminDashboard } from "../controllers/admin.dashboard.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";

const router = Router();

// Auth admin (page dédiée: /admin/login)
router.post("/auth/login", adminLogin);

// Dashboard (KPIs)
router.get("/dashboard", requireAuth, requireRole("admin"), getAdminDashboard);

export default router;
