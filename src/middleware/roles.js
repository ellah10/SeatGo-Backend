
export function requireRole(role) {
  return function (req, res, next) {
    const userRole = req.user?.role;
    if (userRole !== role) {
      return res.status(403).json({ message: "Accès refusé" });
    }
    next();
  };
}
