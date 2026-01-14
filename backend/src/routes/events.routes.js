const express = require("express");
const { google } = require("googleapis");
const router = express.Router();
const db = require("../config/db");

function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

async function getAuthClientForUser(userId) {
  const [rows] = await db.promise().query(
    "SELECT access_token, refresh_token, scope, token_type, expiry_date FROM google_tokens WHERE codigo_usuario = ?",
    [userId]
  );

  if (!rows.length) {
    return null;
  }

  const tokenRow = rows[0];
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
  if (endDateTime <= startDateTime) {
    endDateTime.setDate(endDateTime.getDate() + 1);
  }
  const endDate = `${endDateTime.getFullYear()}-${pad(endDateTime.getMonth() + 1)}-${pad(endDateTime.getDate())}`;
  const endTimeFinal = `${endValue}:00`;
  return {
    start: { dateTime: `${date}T${startValue}:00`, timeZone: "Europe/Madrid" },
    end: { dateTime: `${endDate}T${endTimeFinal}`, timeZone: "Europe/Madrid" }
  };
}

async function createGoogleCalendarEvent(userId, payload) {
  const authClient = await getAuthClientForUser(userId);
  if (!authClient) {
    const err = new Error("Google account not connected.");
    err.code = "GOOGLE_NOT_CONNECTED";
    throw err;
  }

  const calendar = google.calendar({ version: "v3", auth: authClient });
  const { date, startTime, endTime, title, description, location, meet, drive, maps } = payload;
  const { start, end } = buildCalendarTimes(date, startTime, endTime);

  const descriptionParts = [
    description || "",
    location ? `Ubicacion: ${location}` : "",
    meet ? `Meet: ${meet}` : "",
    drive ? `Drive: ${drive}` : "",
    maps ? `Maps: ${maps}` : ""
  ].filter(Boolean);

  const requestBody = {
    summary: title || "Evento",
    description: descriptionParts.join("\n"),
    location: location || undefined,
    start,
    end
  };

  const response = await calendar.events.insert({
    calendarId: "primary",
    requestBody
  });

  return response.data;
}

router.get("/", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];

    const query = `
      SELECT e.codigo_evento,
             DATE_FORMAT(e.fec_inicio, '%Y-%m-%d') AS date,
             e.tipo AS type,
             e.titulo AS title,
             e.descripcion AS description,
             e.hora_inicio AS startTime,
             e.hora_fin AS endTime,
             e.ubicacion AS location,
             e.meet_link AS meet,
             e.drive_link AS drive,
             e.maps_link AS maps,
             'propio' AS ownership,
             NULL AS senderName
        FROM evento e
       WHERE e.codigo_usuario_fk = ?

      UNION

      SELECT e.codigo_evento,
             DATE_FORMAT(e.fec_inicio, '%Y-%m-%d') AS date,
             e.tipo AS type,
             e.titulo AS title,
             e.descripcion AS description,
             e.hora_inicio AS startTime,
             e.hora_fin AS endTime,
             e.ubicacion AS location,
             e.meet_link AS meet,
             e.drive_link AS drive,
             e.maps_link AS maps,
             'compartido' AS ownership,
             CONCAT(u.nom, ' ', u.apes) AS senderName
        FROM evento e
        JOIN evento_participante ep ON e.codigo_evento = ep.codigo_evento
        JOIN usuario u ON e.codigo_usuario_fk = u.codigo_usuario
       WHERE ep.codigo_usuario = ?
    `;

    const [rows] = await db.promise().query(query, [userId, userId]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error cargando eventos" });
  }
});

router.post("/", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"];
    const {
      date,
      type,
      title,
      description,
      startTime,
      endTime,
      location,
      meet,
      drive,
      maps,
      sharedWithEmail
    } = req.body;
    const code = `E${Date.now()}`;
    const io = req.app.get("io");

    await db.promise().query(
      `INSERT INTO evento
        (codigo_evento, codigo_usuario_fk, fec_inicio, tipo, titulo, descripcion, hora_inicio, hora_fin, ubicacion, meet_link, drive_link, maps_link)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [code, userId, date, type, title, description, startTime, endTime, location, meet, drive, maps]
    );

    let googleSync = { ok: true };
    try {
      await createGoogleCalendarEvent(userId, {
        date,
        startTime,
        endTime,
        title,
        description,
        location,
        meet,
        drive,
        maps
      });
    } catch (err) {
      googleSync = {
        ok: false,
        reason: err?.code === "GOOGLE_NOT_CONNECTED" ? "not_connected" : "google_error"
      };
      console.error("Error creando evento en Google Calendar:", err?.response?.data || err);
    }

    if (sharedWithEmail) {
      const [users] = await db
        .promise()
        .query("SELECT codigo_usuario FROM usuario WHERE correo = ?", [sharedWithEmail]);

      if (users.length > 0) {
        const guestId = users[0].codigo_usuario;
        await db
          .promise()
          .query("INSERT INTO evento_participante (codigo_evento, codigo_usuario) VALUES (?, ?)", [code, guestId]);

        const [owners] = await db
          .promise()
          .query("SELECT nom, apes FROM usuario WHERE codigo_usuario = ?", [userId]);
        const ownerName = owners.length ? `${owners[0].nom} ${owners[0].apes}` : null;

        io.to(guestId).emit("nuevo_evento_compartido", {
          codigo_evento: code,
          title,
          date,
          type,
          description,
          startTime,
          endTime,
          location,
          meet,
          drive,
          maps,
          ownership: "compartido",
          senderName: ownerName
        });

        try {
          await createGoogleCalendarEvent(guestId, {
            date,
            startTime,
            endTime,
            title,
            description,
            location,
            meet,
            drive,
            maps
          });
        } catch (err) {
          console.error("Error creando evento en Google Calendar para invitado:", err?.response?.data || err);
        }
      }
    }

    res.status(201).json({ codigo_evento: code, ...req.body, googleSync });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error creando evento" });
  }
});

router.put("/:codigo_evento", async (req, res) => {
  try {
    const { codigo_evento } = req.params;
    const { date, type, title, description, startTime, endTime, location, meet, drive, maps } = req.body;

    const [result] = await db.promise().query(
      `UPDATE evento
       SET fec_inicio = ?, tipo = ?, titulo = ?, descripcion = ?, hora_inicio = ?, hora_fin = ?, ubicacion = ?, meet_link = ?, drive_link = ?, maps_link = ?
       WHERE codigo_evento = ?`,
      [date, type, title, description, startTime, endTime, location, meet, drive, maps, codigo_evento]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ msg: "Evento no encontrado" });
    }

    res.json({ msg: "Evento actualizado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error en el servidor al actualizar" });
  }
});

router.delete("/:codigo_evento", async (req, res) => {
  try {
    const { codigo_evento } = req.params;
    const userId = req.headers["x-user-id"];
    const io = req.app.get("io");

    const [participants] = await db.promise().query(
      "SELECT codigo_usuario FROM evento_participante WHERE codigo_evento = ?",
      [codigo_evento]
    );

    const [eventData] = await db.promise().query(
      "SELECT codigo_usuario_fk FROM evento WHERE codigo_evento = ?",
      [codigo_evento]
    );

    if (eventData.length === 0) {
      return res.status(404).json({ msg: "No encontrado" });
    }

    const ownerId = eventData[0].codigo_usuario_fk;

    const [result] = await db.promise().query(
      `DELETE FROM evento
       WHERE codigo_evento = ? AND (codigo_usuario_fk = ? OR codigo_evento IN (SELECT codigo_evento FROM evento_participante WHERE codigo_usuario = ?))`,
      [codigo_evento, userId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ msg: "No se pudo borrar o no tienes permiso" });
    }

    if (userId === ownerId) {
      participants.forEach((p) => {
        io.to(p.codigo_usuario).emit("evento_eliminado", codigo_evento);
      });
    } else {
      io.to(ownerId).emit("evento_eliminado", codigo_evento);
    }

    res.json({ msg: "Eliminado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error al eliminar" });
  }
});

module.exports = router;
