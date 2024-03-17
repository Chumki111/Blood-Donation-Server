const express = require('express');
const app = express();
require('dotenv').config();
const cors = require('cors');
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const stripe = require('stripe')(process.env.PAYMENT_SCERET_KEY)
// middleWare
const corsOption = {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
    optionSuccessStatus: 200,
}

app.use(cors(corsOption));
app.use(express.json());
app.use(cookieParser());
// verify token
const verifyToken = async (req, res, next) => {
    const token = req.cookies?.token;
    console.log(token);
    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            console.log(err);
            return res.status(401).send({ message: 'unauthorized access' })
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
        const usersCollection = client.db('Blood_Donation').collection('users')
        const donationsCollection = client.db('Blood_Donation').collection('donations')
        const paymentsCollection = client.db('Blood_Donation').collection('payments')
        // auth related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            console.log('I need a new jwt', user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '365d',
            })
            res
                .cookie("token", token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                })
                .send({ success: true })
        })
        //  logout
        app.get('/logout', async (req, res) => {
            try {
                res
                    .clearCookie('token', {
                        maxAge: 0,
                        secure: process.env.NODE_ENV === 'production',
                        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                    })
                    .send({ success: true })
                console.log('Logout successful')
            } catch (err) {
                res.status(500).send(err)
            }
        })
        // save  or modify user email,status in db
        app.put('/users/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const query = { email: email }
            const options = { upsert: true };
            const isExist = await usersCollection.findOne(query);
            console.log('User Found---->', isExist);
            if (isExist) return res.send(isExist);
            const result = await usersCollection.updateOne(
                query,
                {
                    $set: { ...user, timestamp: Date.now() }
                },
                options

            )
            res.send(result)

        })
        // get all users 
        app.get('/users',async(req,res) =>{
            const result = await usersCollection.find().toArray();
            res.send(result)
        })
        
        // post a donation
        app.post('/donations', async (req, res) => {
            const donation = req.body;
            const result = await donationsCollection.insertOne(donation);
            res.send(result);
        })
        // all donations
        app.get('/donations', async (req, res) => {

            const result = await donationsCollection.find().toArray()
            res.send(result)
        })
        // get single room 
        app.get('/donation/:id', async (req, res) => {
            const id = req.params.id;
            const result = await donationsCollection.findOne({ _id: new ObjectId(id) });
            res.send(result);
        })
        // donar pending donation-->
        app.get('/pending-donations/pending/:email', async (req, res) => {
            const email = req.params.email;
            // Filter donations with pending status
            const query = { requester_email: email, donation_status: 'pending' };
            const result = await donationsCollection.find(query).toArray();
            res.send(result)
        })

        // Endpoint to get a single pending donation by ID
        app.get('/pending-donations/:id', async (req, res) => {
            const id = req.params.id;
            // Filter donation with pending status and the provided ID
            const query = { _id: new ObjectId(id), donation_status: 'pending' };
            const result = await donationsCollection.findOne(query);
            res.send(result);
        })
        // donar donations
        app.get('/donations/:email', async (req, res) => {
            const email = req.params.email;
            const query = { requester_email: email }
            const result = await donationsCollection.find(query).toArray();
            res.send(result)
        })
        // pending donation status change--->
        app.patch('/update-donation-status/:id', async (req, res) => {
            const id = req.params.id;
            const { donation_status } = req.body;
            const query = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    donation_status: donation_status
                }
            }
            const result = await donationsCollection.updateOne(query, updateDoc);
            res.send(result)
        })
        //    delete donation
        app.delete('/delete/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await donationsCollection.deleteOne(query);
            res.send(result)
        })

        // payment intent-->
        app.post('/create-payment-intent', verifyToken, async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            console.log('amount', amount);
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            })
            res.send({ clientSecret: paymentIntent.client_secret })
        })
        // save payments information in collection

        app.post('/payments', verifyToken, async (req, res) => {
            const booking = req.body;
            const result = await paymentsCollection.insertOne(booking);
            // sent email----->
            res.send(result);
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        //   await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello from Blood_Donation Server..')
})

app.listen(port, () => {
    console.log(`Blood_Donation is running on port ${port}`)
})
