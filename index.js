const express=require('express');
const app= express();
require('dotenv').config();
const cors=require('cors');
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion } = require('mongodb');
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
// verify token
const verifyToken= async(req,res,next) =>{
    const token= req.cookies?.token;
    console.log(token);
    if(!token){
    return res.status(401).send({message : 'unauthorized access'})
    }
    jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded) =>{
        if(err){
            console.log(err);
            return res.status(401).send({message : 'unauthorized access'})
        }
        req.user = decoded;
        next();
    })
}
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(process.env.DB_URL, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });
  async function run() {
    try {
     
      // Send a ping to confirm a successful connection
      await client.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
      // Ensures that the client will close when you finish/error
    //   await client.close();
    }
  }
  run().catch(console.dir);

app.get('/',(req,res) =>{
    res.send('Hello from Blood_Donation Server..')
})

app.listen(port, () => {
    console.log(`Blood_Donation is running on port ${port}`)
  })
