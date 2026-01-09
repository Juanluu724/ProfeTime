const express = require("express");
const router = express.Router();
const db = require("../config/db");

router.get("/", async(req, res) => {
    try {
        // ⚠️ TEMPORAL (luego irá con JWT)
        const userId = "U001";

        // EVENTOS
        const [eventos] = await db.promise().query(
            `SELECT codigo_evento, fec_inicio, tipo 
       FROM evento 
       WHERE codigo_usuario_fk = ?`, [userId]
        );

        // CONTADORES
        const [conteo] = await db.promise().query(
            `SELECT tipo, COUNT(*) AS total
       FROM evento
       WHERE codigo_usuario_fk = ?
       GROUP BY tipo`, [userId]
        );

        // NOTIFICACIONES
        const [notificaciones] = await db.promise().query(
            `SELECT n.codigo_notificacion, n.nombre AS titulo, e.fec_inicio, e.tipo
       FROM notificacion n
       JOIN evento e ON n.codigo_evento = e.codigo_evento
       WHERE e.codigo_usuario_fk = ?
       ORDER BY e.fec_inicio ASC
       LIMIT 3`, [userId]
        );

        // PROCESAR CONTADORES
        const menuCounts = { examenes: 0, tareas: 0, reuniones: 0 };

        conteo.forEach(c => {
            if (c.tipo === "examen") menuCounts.examenes = c.total;
            if (c.tipo === "tarea") menuCounts.tareas = c.total;
            if (c.tipo === "reunion") menuCounts.reuniones = c.total;
        });

        // PROCESAR NOTIFICACIONES
        const notifications = notificaciones.map(n => ({
            id: n.codigo_notificacion,
            type: n.tipo,
            title: n.titulo,
            time: new Date(n.fec_inicio).toLocaleDateString(),
            badge: "24h"
        }));

        // EVENTOS CALENDARIO
        const calendarEvents = eventos.map(e => ({
            date: e.fec_inicio,
            type: e.tipo
        }));

        res.json({
            menuCounts,
            notifications,
            calendarEvents
        });

    } catch (error) {
        console.error("Error dashboard:", error);
        res.status(500).json({ msg: "Error dashboard" });
    }
});

module.exports = router;