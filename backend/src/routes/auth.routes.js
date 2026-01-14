const express = require("express");
const { google } = require("googleapis");
const router = express.Router();
const db = require("../config/db");

const allowedDomain = (process.env.ALLOWED_GOOGLE_DOMAIN || "campuscamara.es")
  .toLowerCase()
  .replace(/^@/, "");
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:4200";

const googleScopes = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/drive.file"
];

function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

router.post("/login", (req, res) => {

  const { correo, password } = req.body;

  console.log("BODY RECIBIDO:", correo, password);

  const sql = `
    SELECT codigo_usuario, nom, apes, correo
    FROM usuario
    WHERE correo = ? AND password = ?
  `;

  db.query(sql, [correo, password], (err, rows) => {
    if (err) {
      console.error("Error en la consulta:", err);
      return res.status(500).json({ msg: "Error interno del servidor" });
    }

    console.log("FILAS DEVUELTAS:", rows.length);

    if (rows.length === 0) {
      return res.status(401).json({ msg: "Correo o contraseña incorrectos" });
    }

    const user = rows[0];

    res.status(200).json({
      msg: "Login correcto",
      user
    });
  });
});

router.get("/google", (req, res) => {
  const oauth2Client = createOAuthClient();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: googleScopes,
    hd: allowedDomain
  });

  return res.redirect(authUrl);
});

router.get("/google/callback", async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).send("Missing code.");
    }

    const oauth2Client = createOAuthClient();
    const tokenResponse = await oauth2Client.getToken(code);
    const tokens = tokenResponse.tokens || {};
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const profile = await oauth2.userinfo.get();
    const email = (profile.data.email || "").toLowerCase();

    if (!email.endsWith(`@${allowedDomain}`)) {
      return res.status(403).send("Domain not allowed.");
    }

    const [users] = await db
      .promise()
      .query(
        "SELECT codigo_usuario, nom, apes, correo FROM usuario WHERE correo = ?",
        [email]
      );

    let user = users[0];
    if (!user) {
      const fullName = profile.data.name || "";
      const nameParts = fullName.trim().split(" ").filter(Boolean);
      const nom = nameParts.shift() || email.split("@")[0];
      const apes = nameParts.join(" ");
      const codigoUsuario = `U${Date.now()}`;

      await db
        .promise()
        .query(
          "INSERT INTO usuario (codigo_usuario, nom, apes, correo, password) VALUES (?, ?, ?, ?, ?)",
          [codigoUsuario, nom, apes, email, ""]
        );

      user = { codigo_usuario: codigoUsuario, nom, apes, correo: email };
    }

    await db
      .promise()
      .query(
        `INSERT INTO google_tokens
          (codigo_usuario, access_token, refresh_token, scope, token_type, expiry_date)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          access_token = VALUES(access_token),
          refresh_token = COALESCE(VALUES(refresh_token), refresh_token),
          scope = VALUES(scope),
          token_type = VALUES(token_type),
          expiry_date = VALUES(expiry_date)`,
        [
          user.codigo_usuario,
          tokens.access_token || null,
          tokens.refresh_token || null,
          tokens.scope || null,
          tokens.token_type || null,
          tokens.expiry_date || null
        ]
      );

    const payload = Buffer.from(JSON.stringify(user)).toString("base64");
    return res.redirect(`${frontendUrl}/login?auth=${encodeURIComponent(payload)}`);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Google auth failed.");
  }
});

module.exports = router;
