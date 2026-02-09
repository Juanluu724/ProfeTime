const { admin } = require("../config/firebase");

async function firebaseAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      return res.status(401).json({ msg: "No autorizado. Falta token." });
    }

    const decoded = await admin.auth().verifyIdToken(match[1]);
    req.userId = decoded.uid;
    req.userEmail = decoded.email || null;
    req.userName = decoded.name || null;
    req.userPicture = decoded.picture || null;
    req.userClaims = decoded || null;
    return next();
  } catch (err) {
    const isProduction =
      String(process.env.NODE_ENV || "").toLowerCase() === "production";

    if (!isProduction) {
      console.error("Firebase token verification failed:", err?.code, err?.message);
    }

    return res.status(401).json({
      msg: "Token invalido.",
      ...(isProduction
        ? {}
        : {
            code: err?.code || "unknown",
            detail: err?.message || String(err)
          })
    });
  }
}

module.exports = firebaseAuth;
