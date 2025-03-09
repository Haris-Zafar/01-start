import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();
const port =  process.env.PORT || 3000;
const app = express();
mongoose.connect('mongodb://localhost:27017/');

app.listen(port, () => console.log(`server is running on ${port}`));