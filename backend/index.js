require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();

// MIDDLEWARES
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CONEXIÓN DB (se inicializa aquí)
require("./src/config/db");

// RUTAS
app.use("/api/auth", require("./src/routes/auth.routes"));
app.use("/api/dashboard", require("./src/routes/dashboard.routes"));
app.use("/api/events", require("./src/routes/events.routes")); // 

// SERVIDOR
app.listen(process.env.PORT, () => {
    console.log(" Servidor backend en puerto", process.env.PORT);
});