const express = require("express");
const { google } = require("googleapis");
const { db } = require("../config/firebase");
const firebaseAuth = require("../middleware/firebaseAuth");

const router = express.Router();

function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

async function getAuthClientForUser(userId) {
  const tokenSnap = await db.collection("google_tokens").doc(userId).get();
  if (!tokenSnap.exists) {
    return null;
  }

  const tokenRow = tokenSnap.data();
  const client = createOAuthClient();
  client.setCredentials({
    access_token: tokenRow.access_token,
    refresh_token: tokenRow.refresh_token,
    scope: tokenRow.scope,
    token_type: tokenRow.token_type,
    expiry_date: tokenRow.expiry_date
  });

  return client;
}

function buildCalendarTimes(date, startTime, endTime) {
  const normalizeTime = (value) => {
    if (!value) return value;
    const trimmed = String(value).trim();
    if (trimmed.length >= 5) return trimmed.slice(0, 5);
    return trimmed;
  };
  const pad = (value) => String(value).padStart(2, "0");

  if (!startTime && !endTime) {
    const start = { date };
    const next = new Date(`${date}T00:00:00`);
    next.setDate(next.getDate() + 1);
    const end = { date: next.toISOString().slice(0, 10) };
    return { start, end };
  }

  const startValue = normalizeTime(startTime) || "09:00";
  const endValue = normalizeTime(endTime) || "10:00";
  const startDateTime = new Date(`${date}T${startValue}:00`);
  let endDateTime = new Date(`${date}T${endValue}:00`);
  if (Number.isNaN(startDateTime.getTime()) || Number.isNaN(endDateTime.getTime())) {
    return null;
  }
  if (endDateTime <= startDateTime) {
    endDateTime.setDate(endDateTime.getDate() + 1);
  }
  const endDate = `${endDateTime.getFullYear()}-${pad(endDateTime.getMonth() + 1)}-${pad(
    endDateTime.getDate()
  )}`;
  const endTimeFinal = `${endValue}:00`;
  return {
    start: { dateTime: `${date}T${startValue}:00`, timeZone: "Europe/Madrid" },
    end: { dateTime: `${endDate}T${endTimeFinal}`, timeZone: "Europe/Madrid" }
  };
}

router.use(firebaseAuth);

router.get("/status", async (req, res) => {
  try {
    const userId = req.userId;
    const tokenSnap = await db.collection("google_tokens").doc(userId).get();
    return res.json({ linked: tokenSnap.exists });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "Error obteniendo estado." });
  }
});

router.post("/meet", async (req, res) => {
  try {
    const userId = req.userId;

    const { date, startTime, endTime, title } = req.body;
    if (!date) {
      return res.status(400).json({ msg: "Fecha requerida para generar Meet." });
    }

    const authClient = await getAuthClientForUser(userId);
    if (!authClient) {
      return res.status(403).json({ msg: "Cuenta no vinculada a Google." });
    }

    const calendar = google.calendar({ version: "v3", auth: authClient });
    const times = buildCalendarTimes(date, startTime, endTime);
    if (!times) {
      return res.status(400).json({ msg: "Fecha u hora invalida." });
    }

    const event = {
      summary: title || "Evento",
      start: times.start,
      end: times.end,
      conferenceData: {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: { type: "hangoutsMeet" }
        }
      }
    };

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
      conferenceDataVersion: 1
    });

    const meetLink =
      response.data.hangoutLink ||
      (response.data.conferenceData?.entryPoints || []).find(
        (entry) => entry.entryPointType === "video"
      )?.uri;

    return res.json({ meetLink });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "Error generando Meet." });
  }
});

router.post("/drive/folder", async (req, res) => {
  try {
    const userId = req.userId;

    const authClient = await getAuthClientForUser(userId);
    if (!authClient) {
      return res.status(403).json({ msg: "Cuenta no vinculada a Google." });
    }

    const drive = google.drive({ version: "v3", auth: authClient });
    const folderName =
      req.body?.name || `ProfeTime ${new Date().toISOString().slice(0, 10)}`;

    const createRes = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder"
      },
      fields: "id"
    });

    const folderId = createRes.data.id;
    await drive.permissions.create({
      fileId: folderId,
      requestBody: { role: "reader", type: "anyone" }
    });

    const fileRes = await drive.files.get({
      fileId: folderId,
      fields: "webViewLink"
    });

    return res.json({ folderId, link: fileRes.data.webViewLink });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "Error creando carpeta en Drive." });
  }
});

router.get("/picker-token", async (req, res) => {
  try {
    const userId = req.userId;

    const authClient = await getAuthClientForUser(userId);
    if (!authClient) {
      return res.status(403).json({ msg: "Cuenta no vinculada a Google." });
    }

    const accessTokenResponse = await authClient.getAccessToken();
    const accessToken = accessTokenResponse?.token;

    if (!accessToken) {
      return res.status(500).json({ msg: "No se pudo obtener el token." });
    }

    return res.json({ accessToken });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: "Error obteniendo token." });
  }
});

module.exports = router;
