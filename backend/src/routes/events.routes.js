const express = require("express");
const router = express.Router();
const db = require("../config/db");

// CREAR EVENTO
router.post("/create", async(req, res) => {
    try {
        const {
            titulo,
            fecha_inicio,
            tipo
        } = req.body;


        const codigo_usuario_fk = "U001";

        if (!titulo || !fecha_inicio || !tipo) {
            return res.status(400).json({ msg: "Faltan datos del evento" });
        }

        const sql = `
      INSERT INTO evento (nombre, fec_inicio, tipo, codigo_usuario_fk)
      VALUES (?, ?, ?, ?)
    `;

        await db.promise().query(sql, [
            titulo,
            fecha_inicio,
            tipo,
            codigo_usuario_fk
        ]);

        res.status(201).json({ msg: "Evento creado correctamente" });

    } catch (error) {
        console.error("Error creando evento:", error);
        res.status(500).json({ msg: "Error al crear evento" });
    }
});

module.exports = router;