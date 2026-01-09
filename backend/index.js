require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();

// 1. MIDDLEWARE CORS (Configuración permisiva total para desarrollo)
app.use(cors()); // Al dejarlo vacío, acepta peticiones desde CUALQUIER origen (*)

// 2. LOGGING (Para ver si la petición llega al servidor)
app.use((req, res, next) => {
    console.log(`Petición recibida: ${req.method} ${req.url}`);
    next();
});

// 3. PARSEO DEL BODY
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 4. CONEXIÓN BASE DE DATOS
// (Si esto falla, el servidor podría detenerse, revisa tu terminal)
require("./src/config/db");

// 5. RUTAS
app.use("/api/auth", require("./src/routes/auth.routes"));
app.use("/api/dashboard", require("./src/routes/dashboard.routes"));
app.use("/api/events", require("./src/routes/events.routes")); 

// 6. ARRANCAR SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("---------------------------------------------------");
    console.log(`>>> Servidor BACKEND corriendo en http://localhost:${PORT}`);
    console.log("---------------------------------------------------");
});