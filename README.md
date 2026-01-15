# Arquitectura y Tecnologías de ProfeTime

Este documento describe la arquitectura técnica, el stack tecnológico y el flujo de datos de la aplicación **ProfeTime**.

## 1. Visión General
ProfeTime es una aplicación web diseñada para la gestión de tiempo y eventos académicos. La arquitectura sigue un modelo **Cliente-Servidor** desacoplado:
* **Frontend:** Single Page Application (SPA) construida con Angular.
* **Backend:** API RESTful y servidor de WebSockets construido con Node.js y Express.
* **Base de Datos:** Relacional (MySQL).
* **Integraciones:** Ecosistema de Google (Calendar, Drive, Meet).

## 2. Stack Tecnológico

### Frontend (Cliente)
La interfaz de usuario y la lógica del cliente están construidas utilizando:
* **Framework:** [Angular v16](https://angular.io/)
* **Lenguaje:** TypeScript (Tipado estático para mayor robustez).
* **Estilos:** SCSS (Sass) para estilos modulares y anidados.
* **Comunicación en Tiempo Real:** `socket.io-client`.
* **Manejo de Asincronía:** RxJS (Observables, Subjects) para gestionar peticiones HTTP y flujos de datos.

### Backend (Servidor)
El servidor maneja la lógica de negocio, la persistencia de datos y la comunicación con APIs externas:
* **Entorno:** Node.js.
* **Framework Web:** [Express](https://expressjs.com/) (Manejo de rutas y middleware).
* **Base de Datos:** MySQL (Driver `mysql2`).
* **Comunicación en Tiempo Real:** `socket.io` (Eventos bidireccionales).
* **Integraciones:** `googleapis` (Cliente oficial de Google para Node.js).
* **Seguridad/Config:** `cors`, `dotenv`.

### Base de Datos
* **Motor:** MySQL.
* **Estructura Principal:**
    * `usuario`: Almacena información de perfil y credenciales.
    * `evento`: Datos principales de los eventos (título, fechas, tipo).
    * `evento_participante`: Tabla pivote para gestionar eventos compartidos entre usuarios.
    * `google_tokens`: Almacenamiento seguro de tokens de acceso y refresh tokens para las integraciones de Google.

---

## 3. Arquitectura del Sistema

### Diagrama de Comunicación
El sistema utiliza un enfoque híbrido de comunicación:

1.  **HTTP (REST):** Para operaciones CRUD (Crear, Leer, Actualizar, Borrar) estándar, como iniciar sesión, obtener el dashboard o guardar un evento.
2.  **WebSockets (Socket.io):** Para notificaciones instantáneas y actualizaciones en tiempo real (ej. cuando un usuario comparte un evento contigo, la notificación aparece sin recargar la página).

```mermaid
graph TD
    Client[Angular Frontend]
    Server[Node.js Express Server]
    DB[(MySQL Database)]
    GAPI[Google APIs]

    Client -- HTTP Request (REST) --> Server
    Server -- JSON Response --> Client
    Client -- WebSocket Event (Socket.io) <--> Server
    
    Server -- SQL Query --> DB
    DB -- Result Set --> Server
    
    Server -- OAuth2 / API Calls --> GAPI
    GAPI -- Token / Data --> Server
