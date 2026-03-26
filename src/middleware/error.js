export function notFound(req, res) {
  res.status(404).json({ message: "Route introuvable" });
}


export function errorHandler(err, req, res, next) {
  console.error("", err);

  if (err?.code === 11000) {
    return res.status(409).json({
      message: "Conflit: ressource déjà existante",
      details: err.keyValue,
    });
  }

  const status = err.statusCode || 500;
  res.status(status).json({ message: err.message || "Erreur serveur" });
}
