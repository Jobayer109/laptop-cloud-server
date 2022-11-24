const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();

app.use(cors());
app.use(express.json());

// Mongodb database connection

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.yj6ddzb.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const dbConnect = async () => {
  try {
    const categoriesCollection = client.db("laptop-cloud").collection("categories");

    app.get("/categories", async (req, res) => {
      const categories = await categoriesCollection.find({}).toArray();
      res.send(categories);
    });
  } finally {
  }
};
dbConnect().catch((error) => console.log(error.message));

app.get("/", (req, res) => {
  res.send("Laptop cloud server is running");
});

app.listen(port, () => {
  console.log(`Laptop cloud server listening on port ${port}`);
});
