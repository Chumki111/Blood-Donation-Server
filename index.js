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
    origin: [
        // 'https://blood-donation-cc6e2.web.app',
        // 'https://blood-donation-cc6e2.firebaseapp.com'
        'http://localhost:5173', 'http://localhost:5174'
    ],
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
        const districtsCollection = client.db('Blood_Donation').collection('districts')
        const upazilasCollection = client.db('Blood_Donation').collection('upazilas')
        const testimonialCollection = client.db('Blood_Donation').collection('Testimonial')
        const serviceSection = client.db('Blood_Donation').collection('services')
        const blogCollection = client.db('Blood_Donation').collection('blogs')
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
        // update user from dashboard
        app.patch('/updateProfile/:email', async (req, res) => {
            try {
                const email = req.params.email;
                const updatedProfile = req.body; // Assuming the request body contains the updated profile data

                // Find the user in the database based on the email
                const query = { email: email };
                const user = await usersCollection.findOne(query);

                if (!user) {
                    return res.status(404).send({ message: 'User not found' });
                }

                // Update the user's profile with the provided data
                const result = await usersCollection.updateOne(query, { $set: updatedProfile });

                if (result.modifiedCount === 0) {
                    return res.status(400).send({ message: 'Failed to update user profile' });
                }

                // Send the updated user profile in the response
                res.send({ message: 'User profile updated successfully', user: updatedProfile });
            } catch (error) {
                console.error('Error updating user profile:', error);
                res.status(500).send({ message: 'Internal server error' });
            }
        })
        // get all users 
        app.get('/users', async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result)
        })

        // get all districts
        app.get('/districts', async (req, res) => {
            const result = await districtsCollection.find().toArray();
            res.send(result)
        })
        // get all upazilas
        app.get('/upazilas', async (req, res) => {
            const result = await upazilasCollection.find().toArray();
            res.send(result)
        })
        app.get('/user/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await usersCollection.findOne(query);
            res.send(result)
        })
        // post a donation
        app.post('/donations', verifyToken, async (req, res) => {
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
        // get single room 
        app.patch('/donations/:id', async (req, res) => {
            const id = req.params.id;
            const updatedData = req.body;

            const query = { _id: new ObjectId(id) }
            const updateDoc = { $set: updatedData };
            const result = await donationsCollection.updateOne(query, updateDoc);
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

        // Get total money received endpoint
        app.get('/total-money-received', verifyToken, async (req, res) => {
           
                const payments = await paymentsCollection.find().toArray();
                
                res.send(payments);
            
        });

        // get all testimonial
        app.get('/Testimonial', async (req, res) => {
            const result = await testimonialCollection.find().toArray();
            res.send(result)
        })
        // get all services
        app.get('/services',async(req,res) =>{
            const result = await serviceSection.find().toArray();
            res.send(result)
        })

        // get single service
        app.get('/service/:id',async(req,res) =>{
            const id = req.params.id;
            const query = {_id : new ObjectId(id)}
            const result = await serviceSection.findOne(query);
            res.send(result)
        })
    //    get all blogs
    app.get('/blogs',async(req,res) =>{
        const  result = await blogCollection.find().toArray();
        res.send(result)
    })

    // get single blog
    app.get('/blog/:id',async(req,res) =>{
        const id = req.params.id;
        const query = {_id : new ObjectId(id)};
        const result = await blogCollection.findOne(query);
        res.send(result)
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
