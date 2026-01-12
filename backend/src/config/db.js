const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "profe_time_db"
});

db.connect(err => {
  if (err) {
    console.error("Error al conectar a MySQL:", err);
  } else {
    console.log("Conectado a MySQL correctamente");
    console.log("BASE DE DATOS ACTUAL: profe_time_clean");
  }
});

module.exports = db;
