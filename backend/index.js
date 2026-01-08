require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();

// MIDDLEWARES (muy importante)
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Conexión DB
const db = require("./src/config/db");

// Rutas
app.use("/api/auth", require("./src/routes/auth.routes"));
app.use("/api/dashboard", require("./src/routes/dashboard.routes")); // <--- ESTA ES LA NUEVA LÍNEA

app.listen(process.env.PORT, () => {
    console.log("🚀 Servidor backend en puerto", process.env.PORT);
});