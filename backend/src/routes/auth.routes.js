const express = require("express");
const { google } = require("googleapis");
const { admin, db } = require("../config/firebase");

const router = express.Router();

const allowedDomain = (process.env.ALLOWED_GOOGLE_DOMAIN || "")
  .toLowerCase()
  .replace(/^@/, "");
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:4200";

const googleScopes = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.readonly"
];

function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

function splitName(fullName, fallbackEmail) {
  const full = (fullName || "").trim();
  if (full) {
    const parts = full.split(" ").filter(Boolean);
    const nom = parts.shift() || fallbackEmail.split("@")[0];
    const apes = parts.join(" ");
    return { nom, apes };
  }
  return { nom: fallbackEmail.split("@")[0], apes: "" };
}

function getFirebaseTokenFromRequest(req) {
  const authHeader = req.headers.authorization || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (match) {
    return match[1];
  }

  // Top-level navigations (window.location) can't set Authorization headers.
  // Allow passing the Firebase idToken via query param for the Google-linking endpoint.
  const tokenFromQuery = req.query?.token || req.query?.idToken;
  if (typeof tokenFromQuery === "string" && tokenFromQuery.trim()) {
    return tokenFromQuery.trim();
  }

  return null;
}

async function verifyFirebaseTokenFromHeader(req) {
  const token = getFirebaseTokenFromRequest(req);
  if (!token) return null;
  return admin.auth().verifyIdToken(token);
}

async function ensureUserDocument(uid, email, name, photoUrl) {
  const usersRef = db.collection("users");
  const userRef = usersRef.doc(uid);
  const snapshot = await userRef.get();
  const lowerEmail = (email || "").toLowerCase();

  if (allowedDomain && lowerEmail && !lowerEmail.endsWith(`@${allowedDomain}`)) {
    const err = new Error("Domain not allowed.");
    err.code = "DOMAIN_NOT_ALLOWED";
    throw err;
  }

  if (snapshot.exists) {
    const existing = snapshot.data();
    const updates = {};
    if (!existing.foto_url && photoUrl) updates.foto_url = photoUrl;
    if (!existing.correo && lowerEmail) updates.correo = lowerEmail;
    if (Object.keys(updates).length) {
      await userRef.set(updates, { merge: true });
    }
    return { ...existing, ...updates };
  }

  const { nom, apes } = splitName(name, lowerEmail || `user-${uid}`);
  const user = {
    codigo_usuario: uid,
    nom,
    apes,
    correo: lowerEmail,
    password: "",
    foto_url: photoUrl || null
  };
  await userRef.set(user);
  return user;
}

router.post("/login", async (req, res) => {
  try {
    const decoded = await verifyFirebaseTokenFromHeader(req);
    if (!decoded) {
      return res.status(401).json({ msg: "No autorizado. Falta token." });
    }

    const user = await ensureUserDocument(
      decoded.uid,
      decoded.email || "",
      decoded.name || "",
      decoded.picture || null
    );

    return res.status(200).json({ msg: "Login correcto", user });
  } catch (err) {
    if (err.code === "DOMAIN_NOT_ALLOWED") {
      return res.status(403).json({ msg: "Domain not allowed." });
    }
    console.error("Error en login Firebase:", err);

    const isProduction =
      String(process.env.NODE_ENV || "").toLowerCase() === "production";
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
});

router.get("/google", async (req, res) => {
  try {
    const decoded = await verifyFirebaseTokenFromHeader(req);
    if (!decoded) {
      return res.status(401).json({ msg: "No autorizado. Falta token." });
    }

    const oauth2Client = createOAuthClient();
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: googleScopes,
      state: decoded.uid,
      ...(allowedDomain ? { hd: allowedDomain } : {})
    });

    return res.redirect(authUrl);
  } catch (err) {
    console.error("Error iniciando OAuth:", err);
    return res.status(500).json({ msg: "Error iniciando Google auth." });
  }
});

router.get("/google/callback", async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) {
      return res.status(400).send("Missing code.");
    }
    if (!state) {
      return res.status(400).send("Missing state.");
    }

    const oauth2Client = createOAuthClient();
    const tokenResponse = await oauth2Client.getToken(code);
    const tokens = tokenResponse.tokens || {};
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const profile = await oauth2.userinfo.get();
    const email = (profile.data.email || "").toLowerCase();
    const photoUrl = profile.data.picture || null;

    const user = await ensureUserDocument(
      state,
      email,
      profile.data.name || "",
      photoUrl
    );

    await db
      .collection("google_tokens")
      .doc(user.codigo_usuario)
      .set(
        {
          codigo_usuario: user.codigo_usuario,
          access_token: tokens.access_token || null,
          refresh_token: tokens.refresh_token || null,
          scope: tokens.scope || null,
          token_type: tokens.token_type || null,
          expiry_date: tokens.expiry_date || null,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );

    const payload = Buffer.from(JSON.stringify(user)).toString("base64");
    return res.redirect(`${frontendUrl}/login?auth=${encodeURIComponent(payload)}`);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Google auth failed.");
  }
});

module.exports = router;
