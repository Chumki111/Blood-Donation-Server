const express=require('express');
const app= express();
require('dotenv').config();
const cors=require('cors');
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
// middleWare
const corsOption ={
    origin:['http://localhost:5173','http://localhost:5174'],
    credentials:true,
    optionSuccessStatus: 200,
}

app.use(cors(corsOption));
app.use(express.json());
app.use(cookieParser());

app.get('/',(req,res) =>{
    res.send('Hello from Blood_Donation Server..')
})

app.listen(port, () => {
    console.log(`Blood_Donation is running on port ${port}`)
  })
