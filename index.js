const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();

app.use(cors());
app.use(express.json());

// Mongodb database connection

app.get("/", (req, res) => {
  res.send("Laptop cloud server is running");
});

app.listen(port, () => {
  console.log(`Laptop cloud server listening on port ${port}`);
});
