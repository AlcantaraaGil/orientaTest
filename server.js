if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
  }
  
  const express = require('express');
  const app = express();
  const bcrypt = require('bcrypt');
  const passport = require('passport');
  const flash = require('express-flash');
  const session = require('express-session');
  const methodOverride = require('method-override');
  const { MongoClient, ObjectId, ServerApiVersion } = require('mongodb');
  
  
  const uri = "mongodb+srv://galcantara67:fpedgKZ4Vvjk5H7X@cluster0.3tqwctv.mongodb.net/?retryWrites=true&w=majority";
  
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });

  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`App listening on port ${port}`));
  
  // Connect to MongoDB and start the server
  async function run() {
    try {
      await client.connect();
      console.log("Connected to MongoDB!");
    } catch(error) {
      console.log(error);
    }
  }
  run();
  
  const initializePassport = require('./passport-config');
  
  initializePassport(
    passport,
    async email => await client.db("oritest").collection("users").findOne({ email: email }),
    async id => await client.db("oritest").collection("users").findOne({ _id: new ObjectId(id) })
  
  )
  
  app.set('view-engine', 'ejs');
  app.use(express.urlencoded({ extended: false }));
  app.use(flash());
  app.use(session({
    secret: 'sec123',
    resave: false,
    saveUninitialized: false
  }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(methodOverride('_method'));
  app.use(express.static(__dirname + '/public'));


  
  app.get('/', checkAuthenticated, (req, res) => {
    res.render('menu.ejs', { name: req.user.name });
  });
  
  app.get('/login', checkNotAuthenticated, (req, res) => {
    res.render('loggin.ejs');
  });
  
  app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
  }));
  
  app.get('/register', checkNotAuthenticated, (req, res) => {
    res.render('reggister.ejs');
  });
  
  app.post('/register', checkNotAuthenticated, async (req, res) => {
    try {
      await registerUser(client, req.body.name, req.body.email, req.body.password);
      res.redirect('/login');
    } catch {
      res.redirect('/register');
    }
  });
  
  app.delete('/logout', (req, res) => {
    req.logOut(() => {});
    res.redirect('/login');
  });
  
  function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
  
    res.redirect('/login');
  }

//acceder a iniciar test
app.get('/test', checkAuthenticated, (req, res) => {
  res.render('testInfo.ejs');
});


//acceder a Preguntas
app.get('/preguntas', checkAuthenticated, async (req, res) => {
  var nump = 1;
  try {
    const pregunta = await client.db("oritest").collection("cuestionarios").findOne({"preguntas.pregunta_id": nump.toString()}, {"preguntas.$": 1});
    if (pregunta && pregunta.preguntas && pregunta.preguntas.length > 0) {
      var p = pregunta.preguntas[0].texto;
      console.log(p);
      res.render('preguntas.ejs', {numpregunta: nump,pregunta: p});
    } else {
      // Manejar el caso en que la pregunta no existe
      res.send("La pregunta no existe");
    }
  } catch (e) {
    // Manejar la excepción
    console.error(e);
    res.send("Error al obtener la pregunta");
  } 
  });

app.post('/preguntas', checkAuthenticated, async (req,res) => {
  var npreg = req.body.nump;
  npreg++;
  try {
    console.log(npreg);
    const pregunta = await client.db("oritest").collection("cuestionarios").findOne({ "preguntas.pregunta_id": npreg.toString()});
    if (pregunta && pregunta.preguntas && pregunta.preguntas.length > 0) {
      var m = pregunta.preguntas[npreg-1].texto;
      res.render('preguntas.ejs', {numpregunta: npreg,pregunta: m});
    } else {
      // Manejar el caso en que la pregunta no existe
      res.send("La pregunta no existe");
    }
  } catch (e) {
    // Manejar la excepción
    console.error(e);
    res.send("Error al obtener la pregunta");
  } 
});




  
  function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return res.redirect('/');
    }
    next();
  }
  
  async function registerUser(client, name, email, password) {
    const hashedPassword = await bcrypt.hash(password, 10);
  
    const existingUser = await client.db("oritest").collection("users").findOne({ email: email });
    if (existingUser) {
      console.log("User already exists");
      throw new Error('User already exists');
    }
  
    const newUser = {
      id: Date.now().toString(),
      name: name,
      email: email,
      password: hashedPassword
    };
  
    const result = await client.db("oritest").collection("users").insertOne(newUser);
    console.log(`New user created with the following id: ${result.insertedId}`);
  }
  


  