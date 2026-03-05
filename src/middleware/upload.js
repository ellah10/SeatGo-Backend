import multer from "multer";
import fs from "fs";
import path from "path";

// Stockage local: /uploads/avatars
const avatarsDir = path.join(process.cwd(), "uploads", "avatars");
fs.mkdirSync(avatarsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    const safeExt = [".png", ".jpg", ".jpeg", ".webp"].includes(ext) ? ext : ".jpg";
    const uid = req.user?._id?.toString() || "user";
    cb(null, `avatar_${uid}_${Date.now()}${safeExt}`);
  },
});

function fileFilter(req, file, cb) {
  if (!file.mimetype?.startsWith("image/")) {
    const err = new Error("INVALID_FILE_TYPE");
    return cb(err);
  }
  cb(null, true);
}

export const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
  },
});
