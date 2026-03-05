import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { uploadAvatar } from "../middleware/upload.js";
import { getMyProfile, updateMyProfile, uploadMyAvatar } from "../controllers/profile.controller.js";

const router = Router();

router.get("/me", requireAuth, getMyProfile);
router.put("/me", requireAuth, updateMyProfile);
router.post(
  "/me/avatar",
  requireAuth,
  uploadAvatar.single("avatar"),
  uploadMyAvatar
);

export default router;
