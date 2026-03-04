import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { getStudentDashboard } from "../controllers/dashboard.controller.js";

const router = Router();

// Dashboard étudiant
router.get("/student", requireAuth, getStudentDashboard);

export default router;
