const express = require("express");
const cors = require("cors");

const groupRoutes = require("./routes/groupRoutes");

const app = express();

app.use(cors({origin: "http://localhost:5173"}));

app.use(express.json());

app.use("/groups", groupRoutes);

module.exports = app;