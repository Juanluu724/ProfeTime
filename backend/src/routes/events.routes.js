const express = require("express");
const router = express.Router();
const db = require("../config/db");

// CREAR EVENTO
router.post("/create", async (req, res) => {
  try {
    // 1. Recibir los datos tal como los envía el Frontend
    const { title, date, startTime, endTime, type, description } = req.body;

    const codigo_usuario_fk = "U001"; // Usuario temporalmente hardcodeado

    // Validación básica
    if (!title || !date || !type) {
      return res.status(400).json({ msg: "Faltan datos obligatorios (título, fecha o tipo)" });
    }

    // 2. Generar un ID único (Simple: 'EVT' + timestamp)
    const codigo_evento = "EVT" + Date.now();

    // 3. Query ajustada a la base de datos
    // Nota: fec_fin lo ponemos igual a fec_inicio si es de un día, duracion en 0 por defecto
    const sql = `
      INSERT INTO evento 
      (codigo_evento, codigo_usuario_fk, nombre, fec_inicio, fec_fin, duracion_estimada, tipo, codigo_modulo)
      VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
    `;

    await db.promise().query(sql, [
      codigo_evento,
      codigo_usuario_fk,
      title, // Se guarda en la columna 'nombre'
      date,  // fec_inicio
      date,  // fec_fin (asumimos evento de 1 día por ahora)
      0,     // duracion (puedes calcularla si quieres)
      type
    ]);

    res.status(201).json({ msg: "Evento creado correctamente", id: codigo_evento });

  } catch (error) {
    console.error("Error creando evento:", error);
    res.status(500).json({ msg: "Error al crear evento" });
  }
});

module.exports = router;