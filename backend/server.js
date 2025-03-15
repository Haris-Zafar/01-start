const express = require("express");
const dotenv = require("dotenv").config();
const { errorHandler } = require("./middleware/errorMiddleware");
const colors = require("colors");
const connectDB = require("./config/db");

const port = process.env.PORT || 3000;
connectDB();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/api/goals", require("./routes/goalRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use(errorHandler);

app.listen(port, () => console.log(`server is running on ${port}`));
