const express = require("express");
const { db } = require("../config/firebase");
const firebaseAuth = require("../middleware/firebaseAuth");

const router = express.Router();

router.use(firebaseAuth);

router.get("/", async (req, res) => {
  try {
    const userId = req.userId;

    const snapshot = await db
      .collection("events")
      .where("codigo_usuario_fk", "==", userId)
      .get();

    const menuCounts = { examenes: 0, tareas: 0, reuniones: 0, otros: 0 };
    const calendarEvents = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.tipo === "examen") menuCounts.examenes += 1;
      if (data.tipo === "tarea") menuCounts.tareas += 1;
      if (data.tipo === "reunion") menuCounts.reuniones += 1;
      if (data.tipo === "otro") menuCounts.otros += 1;

      calendarEvents.push({
        codigo_evento: data.codigo_evento,
        date: data.fec_inicio,
        type: data.tipo,
        title: data.titulo,
        description: data.descripcion,
        startTime: data.hora_inicio,
        endTime: data.hora_fin,
        location: data.ubicacion
      });
    });

    res.json({ menuCounts, calendarEvents });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Error cargando dashboard" });
  }
});

module.exports = router;
