import { verifyToken } from "../utils/jwt.js";
import { User } from "../models/User.js";

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const [type, token] = header.split(" ");

    if (type !== "Bearer" || !token) {
      return res.status(401).json({ message: "Token manquant" });
    }

    const decoded = verifyToken(token);

    const user = await User.findById(decoded.sub)
      .select(
        "_id email firstName lastName phone studentCardNumber isVerified avatarUrl role createdAt updatedAt"
      )
      .lean();

    if (!user) {
      return res.status(401).json({ message: "Utilisateur invalide" });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token invalide" });
  }
}
