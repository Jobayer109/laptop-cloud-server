const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 5000;
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

const dbConnect = async () => {
  try {
    const categoriesCollection = client.db("laptop-cloud").collection("categories");
    const laptopsCollection = client.db("laptop-cloud").collection("laptops");
    const bookingsCollection = client.db("laptop-cloud").collection("bookings");
    const paymentsCollection = client.db("laptop-cloud").collection("payments");
    const productsCollection = client.db("laptop-cloud").collection("products");

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
    app.get("/myOrders", async (req, res) => {
      const orders = await bookingsCollection.find({}).toArray();
      res.send(orders);
    });

    app.get("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await bookingsCollection.findOne(query);
      res.send(result);
    });

    // Add product by seller api
    app.post("/products", async (req, res) => {
      const product = req.body;
      const products = await productsCollection.insertOne(product);
      res.send(products);
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
