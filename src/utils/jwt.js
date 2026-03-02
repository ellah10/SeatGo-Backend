import jwt from "jsonwebtoken";

export function signToken(payload, expiresIn = "7d") {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET manquant dans .env");
  return jwt.sign(payload, secret, { expiresIn });
}

export function verifyToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET manquant dans .env");
  return jwt.verify(token, secret);
}
