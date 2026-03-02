import { verifyToken } from "../utils/jwt.js";
import { User } from "../models/User.js";

/**
 * Middleware JWT:
 * - Attend: Authorization: Bearer <token>
 * - Ajoute: req.user
 */
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [type, token] = header.split(" ");

    if (type !== "Bearer" || !token) {
      return res.status(401).json({ message: "Token manquant" });
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.sub).select("-passwordHash");

    if (!user) return res.status(401).json({ message: "Utilisateur invalide" });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token invalide" });
  }
}
