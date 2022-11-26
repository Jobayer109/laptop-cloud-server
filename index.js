const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(
  "sk_test_51M6ARNB16mRcRBwtghZDWVXEnZ7buzkqGsONphwXADjLW0cCmhFuzf75i8DGnQK8UFkozJEwg6VsZAGGhI837rQT00bJX0iEf6"
);

app.use(cors());
app.use(express.json());

// Mongodb database connection

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.yj6ddzb.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  // console.log(authHeader);
  if (!authHeader) {
    return res.status(401).send("unauthorized access");
  }
  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.JWT_SECRET, function (error, decoded) {
    if (error) {
      return res.status(403).send("Forbidden access");
    }
    req.decoded = decoded;
    next();
  });
};

const dbConnect = async () => {
  try {
    const categoriesCollection = client.db("laptop-cloud").collection("categories");
    // const laptopsCollection = client.db("laptop-cloud").collection("laptops");
    const bookingsCollection = client.db("laptop-cloud").collection("bookings");
    const paymentsCollection = client.db("laptop-cloud").collection("payments");
    const productsCollection = client.db("laptop-cloud").collection("products");
    const usersCollection = client.db("laptop-cloud").collection("users");

    // JWT api
    app.get("/jwt", async (req, res) => {
      const query = { email: req.query.email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "10d" });
        res.send({ token });
      } else {
        res.status(403).send("Forbidden Access");
      }
    });

    // All categories api
    app.get("/categories", async (req, res) => {
      const categories = await categoriesCollection.find({}).toArray();
      res.send(categories);
    });

    app.get("/category/:id", async (req, res) => {
      const id = req.params.id;
      const laptops = await productsCollection.find({}).toArray();

      const filtered = laptops.filter((laptop) => laptop.category_id === id);
      res.send(filtered);
    });

    // submitted Bookings by customer.
    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      const bookings = await bookingsCollection.insertOne(booking);
      res.send(bookings);
    });

    // My orders api
    app.get("/myOrders", verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const query = { email: req.query.email };

      if (req.query.email !== decodedEmail) {
        return res.status(403).send("Forbidden access");
      }
      const orders = await bookingsCollection.find(query).toArray();
      res.send(orders);
    });

    app.get("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await bookingsCollection.findOne(query);
      res.send(result);
    });

    // Create payment intent
    app.post("/create-payment-intent", async (req, res) => {
      const booking = req.body;
      const price = booking.price;
      const amount = price * 100;

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // Payment info api
    app.post("/payments", async (req, res) => {
      const payment = req.body;
      const result = await paymentsCollection.insertOne(payment);
      const query = { _id: ObjectId(payment.bookingId) };
      const updateDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };
      const updateResult = await bookingsCollection.updateOne(query, updateDoc);
      res.send(result);
    });

    // Add product by seller api
    app.post("/products", async (req, res) => {
      const product = req.body;
      const products = await productsCollection.insertOne(product);
      res.send(products);
    });

    // Seller products api
    app.get("/myProducts", async (req, res) => {
      const query = { email: req.query.email };
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });

    // Delete seller's product.
    app.delete("/myProducts/:id", async (req, res) => {
      const query = { _id: ObjectId(req.params.id) };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    });

    // Registered users api
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // Users display api
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find({}).toArray();
      res.send(result);
    });

    // User delete by admin
    app.delete("/users/:id", async (req, res) => {
      const query = { _id: ObjectId(req.params.id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    // Admin making API
    app.put("/users/admin/:id", async (req, res) => {
      const filter = { _id: ObjectId(req.params.id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    // Admin verify API
    app.get("/users/admin/:email", async (req, res) => {
      const query = { email: req.params.email };
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.role === "admin" });
    });

    // Seller verify API
    app.get("/users/seller/:email", async (req, res) => {
      const query = { email: req.params.email };
      const user = await usersCollection.findOne(query);
      res.send({ isSeller: user?.role === "seller" });
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
