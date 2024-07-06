const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const jwt = require('jsonwebtoken')
const cors = require('cors');
const app = express();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const port = process.env.PORT || 5000;


// middleware
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('server is running')
})





// const uri = "mongodb+srv://<username>:<password>@cluster0.wods307.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wods307.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();


    const userCollection = client.db("matrimonyDB").collection("users");
    const userBiodataCollection = client.db("matrimonyDB").collection("usersBiodata");
    const userReviewCollection = client.db("matrimonyDB").collection("usersReview");
    const userFavoriteBioCollection = client.db("matrimonyDB").collection("favoriteBiodata");
    const userPaymentCollection = client.db("matrimonyDB").collection("payments");
    const userRequestCollection = client.db("matrimonyDB").collection("approvedPremium");
  

    // jwt related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_JWT_TOKEN_SECRET)
      res.send({ token })
    })


    // jwt midleware
    const verifyToken = (req, res, next) => {
      // console.log('inside verify token', req.headers);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorize access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_JWT_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorize access.can not verify' })
        }
        req.decoded = decoded;
        next();
      })

    }

    // verify admin token/ Admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access.can not verify admin' })
      }
      next();

    }


    // admin realteda api
    app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(query, updatedDoc);
      res.send(result);

    })

    app.patch('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          roles: 'premium'
        }
      }
      const result = await userCollection.updateOne(query, updatedDoc);
      res.send(result);

    })

    app.get('/users/admin/:email', verifyToken, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';
      }
      console.log({ admin })
      res.send({ admin });

    })


    // Normal user related api
    app.get('/users', verifyToken, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    })

    app.get('/users/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const result = await userCollection.findOne(query)
      res.send(result)
    })


    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });


    // update data 
    app.patch('/usersBiodata/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const options = { upsert: true };
      const updateBiodata = req.body;
      const biodata = {
        $set: {
          name: updateBiodata.name,
          bioType: updateBiodata.bioType,
          age: updateBiodata.age,
          photoUrl: updateBiodata.photoUrl,
          fatherName: updateBiodata.fatherName,
          motherName: updateBiodata.motherName,
          race: updateBiodata.race,
          height: updateBiodata.height,
          weight: updateBiodata.weight,
          occupation: updateBiodata.occupation,
          dateOfBirth: updateBiodata.dateOfBirth,
          mobileNumber: updateBiodata.mobileNumber,
          presentDivision: updateBiodata.presentDivision,
          parmanentDivision: updateBiodata.parmanentDivision,
          expectedPartnerHeight: updateBiodata.expectedPartnerHeight,
          expectedPartnerWeight: updateBiodata.expectedPartnerWeight,
          expectedPartnerAge: updateBiodata.expectedPartnerAge,
        }

      }
      console.log(updateBiodata)
      const result = await userBiodataCollection.updateOne(query, biodata, options);
      res.send(result)
    })

    app.delete('/favoriteData/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await userFavoriteBioCollection.deleteOne(query);
      res.send(result);
    })


    // app.get('/favoriteBiodata', async (req, res) => {
    //   const result = await userFavoriteBioCollection.find().toArray()
    //   res.send(result);
    // });


    app.get('/favoriteBiodata/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const result = await userFavoriteBioCollection.find(query).toArray()
      res.send(result);
    });


    app.post('/favoriteBiodata/:id', verifyToken, async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };

        const existingData = await userFavoriteBioCollection.findOne(query);
        if (existingData) {
          return res.status(400).json({ message: 'Favorite biodata already exists for this id', existingData });
        }

        const favoriteData = {
          ...req.body,
          _id: new ObjectId(id)
        };

        const result = await userFavoriteBioCollection.insertOne(favoriteData);
        res.status(201).json({ message: 'Favorite biodata added successfully', insertedId: result.insertedId });

      } catch (error) {
        console.error('Error adding favorite biodata:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });


    app.get('/userBiodata/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await userBiodataCollection.findOne(query)
      res.send(result)
    })


    app.get('/usersBiodata/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.params.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      const query = { email: email };
      const result = await userBiodataCollection.findOne(query)
      res.send(result);
    })

    app.get('/usersBiodata', async (req, res) => {
      const result = await userBiodataCollection.find().toArray()
      res.send(result);
    })



    app.post('/usersBiodata', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await userBiodataCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await userBiodataCollection.insertOne(user);
      res.send(result);
    });



    app.get('/usersReview', async (req, res) => {
      const result = await userReviewCollection.find().toArray();
      res.send(result)
    })

    app.post('/usersReview', async (req, res) => {
      const review = req.body;
      const result = await userReviewCollection.insertOne(review)
      res.send(result)
    })






    // Payment intent

    app.delete('/contactRequest/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await userPaymentCollection.deleteOne(query);
      res.send(result);
    })


    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount, ' intent inside')
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: [
          "card"
        ],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });

    })

    app.post('/payments', async (req, res) => {
      const payment = req.body;
      const paymentResult = await userPaymentCollection.insertOne(payment);
      console.log('payment section', payment)
      res.send(paymentResult)
    })


    app.get('/paymentInfo/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await userPaymentCollection.findOne(query);
      res.send(result)
    })

    app.get('/userPaymentInfo', verifyToken, async (req, res) => {
      const result = await userPaymentCollection.find().toArray();
      res.send(result)
    })


    app.patch('/userPaymentInfo/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: 'premium'
        }
      }
      const result = await userPaymentCollection.updateOne(query, updatedDoc);
      res.send(result);

    })


    // generate revinue
    app.get('/adminrevenue', verifyToken, verifyAdmin, async (req, res) => {
      // const payments = await userPaymentCollection.find().toArray();
      // const revenue = payments.reduce((total, payment) => total + payment.price, 0)

      const result = await userPaymentCollection.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: {
              $sum: '$price'
            }
          }
        }
      ]).toArray()

      const revenue = result.length > 0 ? result[0].totalRevenue : 0;

      res.send({

        revenue
      })
    })




    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.listen(port, () => {
  console.log(`My server is running on port ${port}`)
})