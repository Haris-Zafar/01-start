const express = require('express')
const dotenv = require('dotenv').config()
const { errorHandler } = require('./middleware/errorMiddleware')
const mongoose = require('mongoose')

const port =  process.env.PORT || 3000;
const app = express();
app.use(express.json())
app.use(express.urlencoded({extended: false}))

app.use('/api/goals', require('./routes/goalRoutes'))
app.use(errorHandler)

mongoose.connect('mongodb://localhost:27017/');

app.listen(port, () => console.log(`server is running on ${port}`));