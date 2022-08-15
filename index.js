const port = 3000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const task = require('./routes')
app.use(express.json());

mongoose
  .connect("mongodb://localhost:27017/to-do-app")
  .then(() => {
    console.log("Connected successful!");
  })
  .catch((err) => {
    console.log("Error: ", err);
  });

app.use("/api", task);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
