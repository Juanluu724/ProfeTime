const express = require("express");
const { google } = require("googleapis");
const { admin, db } = require("../config/firebase");
const firebaseAuth = require("../middleware/firebaseAuth");
const { ACADEMIC_DEGREES } = require("../constants/academicDegrees");
const { getCyclePreferencesForUser } = require("../services/cyclePreferences");

const router = express.Router();

function normalizeString(value) {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function parseAcademicCurso(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number.parseInt(String(value), 10);
  if (parsed === 1 || parsed === 2) return parsed;
  return null;
}

function validateAcademicFields(payload) {
  const type = normalizeString(payload?.type);
  const isAcademic = type === "tarea" || type === "examen";

  const tipoGrado = normalizeString(payload?.tipoGrado);
  const grado = normalizeString(payload?.grado);
  const curso = parseAcademicCurso(payload?.curso);

  if (!isAcademic) {
    return {
      ok: true,
      isAcademic: false,
      tipoGrado: tipoGrado || null,
      grado: grado || null,
      curso
    };
  }

  if (!tipoGrado) {
    return { ok: false, msg: "tipoGrado es obligatorio para tareas/exámenes." };
  }
  if (!["ciclo_formativo", "master_fp"].includes(tipoGrado)) {
    return { ok: false, msg: "tipoGrado no es válido." };
  }
  if (!grado) {
    return { ok: false, msg: "grado es obligatorio para tareas/exámenes." };
  }
  if (!curso) {
    return { ok: false, msg: "curso es obligatorio para tareas/exámenes (1 o 2)." };
  }

  if (tipoGrado === "ciclo_formativo") {
    if (!ACADEMIC_DEGREES.ciclo_formativo.includes(grado)) {
      return { ok: false, msg: "grado no es válido para Ciclo Formativo." };
    }
  }

  if (tipoGrado === "master_fp") {
    if (!ACADEMIC_DEGREES.master_fp.includes(grado)) {
      return { ok: false, msg: "grado no es válido para Máster FP." };
    }
  }

  return { ok: true, isAcademic: true, tipoGrado, grado, curso };
}

function parseCalendarFilters(query) {
  const tipoGrado = normalizeString(query?.tipoGrado);
  const grado = normalizeString(query?.grado);
  const cursoRaw = query?.curso;

  const curso = cursoRaw === undefined ? "" : normalizeString(cursoRaw);
  const parsedCurso = curso ? parseAcademicCurso(curso) : null;
  if (curso && !parsedCurso) {
    return { ok: false, msg: "curso debe ser 1 o 2." };
  }

  if (tipoGrado && !["ciclo_formativo", "master_fp"].includes(tipoGrado)) {
    return { ok: false, msg: "tipoGrado no es válido." };
  }

  return {
    ok: true,
    filters: {
      tipoGrado: tipoGrado || null,
      grado: grado || null,
      curso: parsedCurso
    }
  };
}

function eventMatchesFilters(data, filters) {
  const hasAny = !!(filters?.tipoGrado || filters?.grado || filters?.curso);
  if (!hasAny) return true;

  if (filters.tipoGrado && data.tipo_grado !== filters.tipoGrado) return false;
  if (filters.grado && data.grado !== filters.grado) return false;
  if (filters.curso && data.curso !== filters.curso) return false;
  return true;
}

function sanitizeTipoGrado(value) {
  const normalized = normalizeString(value);
  if (!normalized) return null;
  if (normalized === "ciclo_formativo") return normalized;
  if (normalized === "master_fp") return normalized;
  return null;
}

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

function mapEventToResponse(data, ownership, senderName) {
  return {
    codigo_evento: data.codigo_evento,
    date: data.fec_inicio,
    type: data.tipo,
    title: data.titulo,
    description: data.descripcion,
    tipoGrado: sanitizeTipoGrado(data.tipo_grado),
    grado: data.grado || null,
    curso: data.curso || null,
    startTime: data.hora_inicio,
    endTime: data.hora_fin,
    location: data.ubicacion,
    meet: data.meet_link,
    drive: data.drive_link,
    driveFileId: data.drive_file_id || null,
    driveFileName: data.drive_file_name || null,
    driveMimeType: data.drive_mime_type || null,
    maps: data.maps_link,
    ownership,
    senderName: senderName || null
  };
}

router.use(firebaseAuth);

router.get("/", async (req, res) => {
  try {
    const userId = req.userId;

    const parsed = parseCalendarFilters(req.query || {});
    if (!parsed.ok) {
      return res.status(400).json({ msg: parsed.msg });
    }
    const filters = parsed.filters;

    const { selectedDegrees } = await getCyclePreferencesForUser(userId, req.userClaims);
    const selectedCf = new Set(selectedDegrees?.ciclo_formativo || []);
    const selectedMf = new Set(selectedDegrees?.master_fp || []);

    const isAcademicEventType = (tipo) => {
      const t = normalizeString(tipo).toLowerCase();
      return t === "tarea" || t === "examen";
    };

    const matchesCyclePreferences = (data) => {
      if (!isAcademicEventType(data?.tipo)) return true;

      const tipoGrado = sanitizeTipoGrado(data?.tipo_grado);
      const grado = normalizeString(data?.grado);
      if (!tipoGrado || !grado) return true;

      if (tipoGrado === "ciclo_formativo") return selectedCf.has(grado);
      if (tipoGrado === "master_fp") return selectedMf.has(grado);
      return true;
    };

    const [ownedSnap, sharedSnap] = await Promise.all([
      db.collection("events").where("codigo_usuario_fk", "==", userId).get(),
      db.collection("events").where("participantes", "array-contains", userId).get()
    ]);

    const eventsMap = new Map();

    ownedSnap.forEach((doc) => {
      const data = doc.data();
      if (!matchesCyclePreferences(data)) return;
      if (!eventMatchesFilters(data, filters)) return;
      eventsMap.set(doc.id, mapEventToResponse(data, "propio", null));
    });

    const sharedEvents = [];
    const ownerIds = new Set();
    sharedSnap.forEach((doc) => {
      const data = doc.data();
      if (data.codigo_usuario_fk === userId) {
        return;
      }
      if (!matchesCyclePreferences(data)) {
        return;
      }
      sharedEvents.push({ id: doc.id, data });
      ownerIds.add(data.codigo_usuario_fk);
    });

    const ownerDocs = ownerIds.size
      ? await db.getAll(
          ...Array.from(ownerIds).map((id) => db.collection("users").doc(id))
        )
      : [];

    const ownerNames = new Map();
    ownerDocs.forEach((doc) => {
      if (doc.exists) {
        const data = doc.data();
        const name = [data.nom, data.apes].filter(Boolean).join(" ").trim();
        ownerNames.set(doc.id, name || null);
      }
    });

    sharedEvents.forEach(({ id, data }) => {
      if (!matchesCyclePreferences(data)) return;
      if (!eventMatchesFilters(data, filters)) return;
      eventsMap.set(
        id,
        mapEventToResponse(data, "compartido", ownerNames.get(data.codigo_usuario_fk))
      );
    });

    res.json(Array.from(eventsMap.values()));
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error cargando eventos" });
  }
});

router.post("/", async (req, res) => {
  try {
    const userId = req.userId;
    const {
      date,
      type,
      title,
      description,
      tipoGrado,
      grado,
      curso,
      startTime,
      endTime,
      location,
      meet,
      drive,
      driveFileId,
      driveFileName,
      driveMimeType,
      maps,
      sharedWithEmail,
      sharedWithEmails
    } = req.body;
    const code = `E${Date.now()}`;
    const io = req.app.get("io");

    const academic = validateAcademicFields({ type, tipoGrado, grado, curso });
    if (!academic.ok) {
      return res.status(400).json({ msg: academic.msg });
    }

    const eventDoc = {
      codigo_evento: code,
      codigo_usuario_fk: userId,
      codigo_modulo: null,
      fec_inicio: date,
      fec_fin: date || null,
      duracion_estimada: 0,
      tipo: type,
      titulo: title || null,
      descripcion: description || null,
      tipo_grado: academic.isAcademic ? academic.tipoGrado : null,
      grado: academic.isAcademic ? academic.grado : null,
      curso: academic.isAcademic ? academic.curso : null,
      hora_inicio: startTime || null,
      hora_fin: endTime || null,
      ubicacion: location || null,
      meet_link: meet || null,
      drive_link: drive || null,
      drive_file_id: driveFileId || null,
      drive_file_name: driveFileName || null,
      drive_mime_type: driveMimeType || null,
      maps_link: maps || null,
      participantes: []
    };

    await db.collection("events").doc(code).set(eventDoc);

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

    const toArray = (value) => (Array.isArray(value) ? value : []);
    const rawEmails = [...toArray(sharedWithEmails), sharedWithEmail].filter(Boolean);
    const normalizeEmail = (value) => String(value || "").trim().toLowerCase();
    const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

    const uniqueEmails = Array.from(
      new Set(rawEmails.map(normalizeEmail).filter((email) => isValidEmail(email)))
    );

    if (uniqueEmails.length > 0) {
      const ownerDoc = await db.collection("users").doc(userId).get();
      const ownerData = ownerDoc.exists ? ownerDoc.data() : null;
      const ownerName = ownerData ? `${ownerData.nom} ${ownerData.apes}`.trim() : null;
      const ownerEmail = ownerData?.correo ? normalizeEmail(ownerData.correo) : null;

      for (const email of uniqueEmails) {
        if (ownerEmail && email === ownerEmail) {
          continue;
        }

        const guestQuery = await db
          .collection("users")
          .where("correo", "==", email)
          .limit(1)
          .get();

        if (guestQuery.empty) {
          continue;
        }

        const guestDoc = guestQuery.docs[0];
        const guestId = guestDoc.id;

        await db
          .collection("events")
          .doc(code)
          .update({
            participantes: admin.firestore.FieldValue.arrayUnion(guestId)
          });

        io.to(guestId).emit("nuevo_evento_compartido", {
          codigo_evento: code,
          title,
          date,
          type,
          description,
          tipoGrado: academic.isAcademic ? academic.tipoGrado : null,
          grado: academic.isAcademic ? academic.grado : null,
          curso: academic.isAcademic ? academic.curso : null,
          startTime,
          endTime,
          location,
          meet,
          drive,
          driveFileId,
          driveFileName,
          driveMimeType,
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
          console.error(
            "Error creando evento en Google Calendar para invitado:",
            err?.response?.data || err
          );
        }
      }
    }

    res.status(201).json({
      codigo_evento: code,
      ...req.body,
      tipoGrado: academic.isAcademic ? academic.tipoGrado : null,
      grado: academic.isAcademic ? academic.grado : null,
      curso: academic.isAcademic ? academic.curso : null,
      googleSync
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error creando evento" });
  }
});

router.put("/:codigo_evento", async (req, res) => {
  try {
    const { codigo_evento } = req.params;
    const {
      date,
      type,
      title,
      description,
      tipoGrado,
      grado,
      curso,
      startTime,
      endTime,
      location,
      meet,
      drive,
      driveFileId,
      driveFileName,
      driveMimeType,
      maps
    } =
      req.body;

    const eventRef = db.collection("events").doc(codigo_evento);
    const snapshot = await eventRef.get();
    if (!snapshot.exists) {
      return res.status(404).json({ msg: "Evento no encontrado" });
    }

    const academic = validateAcademicFields({ type, tipoGrado, grado, curso });
    if (!academic.ok) {
      return res.status(400).json({ msg: academic.msg });
    }

    await eventRef.update({
      fec_inicio: date,
      tipo: type,
      titulo: title,
      descripcion: description,
      tipo_grado: academic.isAcademic ? academic.tipoGrado : null,
      grado: academic.isAcademic ? academic.grado : null,
      curso: academic.isAcademic ? academic.curso : null,
      hora_inicio: startTime,
      hora_fin: endTime,
      ubicacion: location,
      meet_link: meet,
      drive_link: drive,
      drive_file_id: driveFileId || null,
      drive_file_name: driveFileName || null,
      drive_mime_type: driveMimeType || null,
      maps_link: maps
    });

    res.json({ msg: "Evento actualizado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error en el servidor al actualizar" });
  }
});

router.delete("/:codigo_evento", async (req, res) => {
  try {
    const { codigo_evento } = req.params;
    const userId = req.userId;
    const io = req.app.get("io");

    const eventRef = db.collection("events").doc(codigo_evento);
    const snapshot = await eventRef.get();
    if (!snapshot.exists) {
      return res.status(404).json({ msg: "No encontrado" });
    }

    const data = snapshot.data();
    const ownerId = data.codigo_usuario_fk;
    const participants = Array.isArray(data.participantes) ? data.participantes : [];

    const isParticipant = participants.includes(userId);
    const isOwner = ownerId === userId;
    if (!isOwner && !isParticipant) {
      return res.status(404).json({ msg: "No se pudo borrar o no tienes permiso" });
    }

    await eventRef.delete();

    if (isOwner) {
      participants.forEach((participantId) => {
        io.to(participantId).emit("evento_eliminado", codigo_evento);
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
