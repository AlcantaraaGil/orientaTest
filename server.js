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
  const pre = await client.db("oritest").collection("cuestionarios").findOne({ "preguntas.pregunta_id": npreg.toString()});
  var numbase = npreg;
  var areaP=pre.preguntas[numbase-1].area; 
  const respuesta = req.body.respuesta;
  await sendAnswer(client,numbase,req.user.id,respuesta,areaP);
  
  npreg++;
    if(npreg<=98){
  try {
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
}
else{
  calcularRes(client,res,req);
}
  
  
});






app.get('/resultados',checkAuthenticated,async (req,res) =>{
  calcularRes(client,res,req);
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

  async function sendAnswer (client, preguntaid, userid, respuesta,areaP){
    const newAnswer = {
      respuesta: respuesta,
      preguntaid: preguntaid,
      userid: userid,
      areaP: areaP
    };
    console.log(newAnswer);
    const result = await client.db("oritest").collection("respuestas").insertOne(newAnswer);
  }
  
async function calcularRes (client,res,req){

  const interesesResulta = {
    iAdministrativa:{
      area: "Administrativa",
      subAreas: ["Organización","Supervisión","Orden","Análisis y síntesis","Colaboración","Cálculo"],
      aptitudes: ["Persuasivo","Objetivo","Práctico","Tolerante","Responsable","Ambicioso"]
    },
    iHumanidades:{
      area: "de Humanidades y Juridicas",
      subAreas: ["Precisión Verbal","Organización","Lingüística","Orden","Justicia"],
      aptitudes:["Responsable","Justo","Conciliador","Persuasivo","Imaginativo"]
    },
    iArtistica:{
      area: "Artistica",
      subAreas:["Estético","Armónico","Manual","Visual","Auditivo"],
      aptitudes: ["Sensible","Imaginativo","Creativo","Detallista","Innovador","Intuitivo"]
    },
    iSalud:{
      area:"de Ciencias de la Salud",
      subAreas:["Asistir","Investigar","Precisión","Percepción","Análisis","Ayudar"],
      aptitudes:["Altruista","Solidario","Paciente","Comprensivo","Respetuoso","Persuasivo"]
    },
    iEnsenanza:{
      area:"de Enseñanzas Tecnicas",
      subAreas:["Cálculo","Científico","Manual","Exactitud","Planificar"],
      aptitudes:["Preciso","Práctico","Crítico","Analítico","Rígido"]
    },
    iDefensa:{
      area:"de Defenza y Seguridad",
      subAreas:["Justicia","Equidad","Colaboración","Espíritu de equipo","Liderazgo"],
      aptitudes: ["Arriesgado","Solidario","Valiente","Agresivo","Persuasivo"]
    },
    iCiencias:{
      area:"de Ciencias experimentales",
      subAreas: ["Investigación","Orden","Organización","Análisis y Síntesis","Cálculo numérico","Clasificar"],
      aptitudes:["Metódico","Analítico","Observador","Introvertido","Paciente","Seguro"]
    }
  };


  const aptitudResulta = {
    aAdministrativa:{
      area: "Administrativa",
      subAreas: ["Organización","Supervisión","Orden","Análisis y síntesis","Colaboración","Cálculo"],
      aptitudes: ["Persuasivo","Objetivo","Práctico","Tolerante","Responsable","Ambicioso"]
    },
    aHumanidades:{
      area: "de Humanidades y Juridicas",
      subAreas: ["Precisión Verbal","Organización","Lingüística","Orden","Justicia"],
      aptitudes:["Responsable","Justo","Conciliador","Persuasivo","Imaginativo"]
    },
    aArtistica:{
      area: "Artistica",
      subAreas:["Estético","Armónico","Manual","Visual","Auditivo"],
      aptitudes: ["Sensible","Imaginativo","Creativo","Detallista","Innovador","Intuitivo"]
    },
    aSalud:{
      area:"de Ciencias de la Salud",
      subAreas:["Asistir","Investigar","Precisión","Percepción","Análisis","Ayudar"],
      aptitudes:["Altruista","Solidario","Paciente","Comprensivo","Respetuoso","Persuasivo"]
    },
    aEnsenanza:{
      area:"de Enseñanzas Tecnicas",
      subAreas:["Cálculo","Científico","Manual","Exactitud","Planificar"],
      aptitudes:["Preciso","Práctico","Crítico","Analítico","Rígido"]
    },
    aDefensa:{
      area:"de Defenza y Seguridad",
      subAreas:["Justicia","Equidad","Colaboración","Espíritu de equipo","Liderazgo"],
      aptitudes: ["Arriesgado","Solidario","Valiente","Agresivo","Persuasivo"]
    },
    aCiencias:{
      area:"de Ciencias experimentales",
      subAreas: ["Investigación","Orden","Organización","Análisis y Síntesis","Cálculo numérico","Clasificar"],
      aptitudes:["Metódico","Analítico","Observador","Introvertido","Paciente","Seguro"]
    }
  };




  const iAdministrativa = await client.db("oritest").collection("respuestas").countDocuments({ areaP: "IC", respuesta: "si",userid: req.user.id });
  console.log('IC '+iAdministrativa);

  const iHumanidades = await client.db("oritest").collection("respuestas").countDocuments({ areaP: "IH", respuesta: "si",userid: req.user.id });
  console.log('IH '+iHumanidades);

  const iArtistica = await client.db("oritest").collection("respuestas").countDocuments({ areaP: "IA", respuesta: "si",userid: req.user.id });
  console.log('IA '+iArtistica);

  const iSalud = await client.db("oritest").collection("respuestas").countDocuments({ areaP: "IS", respuesta: "si",userid: req.user.id });
  console.log('IS '+iSalud);

  const iEnsenanza = await client.db("oritest").collection("respuestas").countDocuments({ areaP: "II", respuesta: "si",userid: req.user.id });
  console.log('II '+iEnsenanza);
  
  const iDefensa = await client.db("oritest").collection("respuestas").countDocuments({ areaP: "ID", respuesta: "si",userid: req.user.id });
  console.log('ID '+iDefensa);

  const iCiencias = await client.db("oritest").collection("respuestas").countDocuments({ areaP: "IE", respuesta: "si",userid: req.user.id });
  console.log('IE '+iCiencias);

//----------------APTITUDES-----------------------------------------------
const aAdministrativa = await client.db("oritest").collection("respuestas").countDocuments({ areaP: "AC", respuesta: "si",userid: req.user.id });
  console.log('AC '+aAdministrativa);

  const aHumanidades = await client.db("oritest").collection("respuestas").countDocuments({ areaP: "AH", respuesta: "si",userid: req.user.id });
  console.log('AH '+aHumanidades);

  const aArtistica = await client.db("oritest").collection("respuestas").countDocuments({ areaP: "AA", respuesta: "si",userid: req.user.id });
  console.log('AA '+aArtistica);

  const aSalud = await client.db("oritest").collection("respuestas").countDocuments({ areaP: "AS", respuesta: "si",userid: req.user.id });
  console.log('AS '+aSalud);

  const aEnsenanza = await client.db("oritest").collection("respuestas").countDocuments({ areaP: "AI", respuesta: "si",userid: req.user.id });
  console.log('AI '+aEnsenanza);
  
  const aDefensa = await client.db("oritest").collection("respuestas").countDocuments({ areaP: "AD", respuesta: "si",userid: req.user.id });
  console.log('AD '+aDefensa);

  const aCiencias = await client.db("oritest").collection("respuestas").countDocuments({ areaP: "AE", respuesta: "si",userid: req.user.id });
  console.log('AE '+aCiencias);

var variables = {iAdministrativa, iHumanidades, iArtistica, iSalud, iEnsenanza, iDefensa, iCiencias}
var max = -Infinity;
var variablesMasAltas = [];
var variableMaxima = "";

// Iterar sobre las propiedades del objeto variables
for (var variable in variables) {
  var valorActual = variables[variable];

  if (valorActual > max) {
    max = valorActual;
    variablesMasAltas = [{ nombre: variable, valor: valorActual }];
    variableMaxima = variable;
  } else if (valorActual === max) {
    variablesMasAltas.push({ nombre: variable, valor: valorActual });
  }
}

console.log("El valor máximo de intereses es: " + max);
console.log("Variable de intereses con el valor máximo: " + variableMaxima);

if (variablesMasAltas.length > 1) {
  console.log("Variables de intereses con el mismo valor máximo:");
  variablesMasAltas.forEach(function (variable) {
    console.log(variable.nombre + ": " + variable.valor);
  });
}


//res.render('resultados.ejs', { respuestass: variablesMasAltass, variableMaximaa: variableMaximaa, aptitudesResulta: aptitudesResulta });


//-------------------------Aptitudes-------------------------
// Iterar sobre las propiedades del objeto variables
var variabless = {aAdministrativa, aHumanidades, aArtistica, aSalud, aEnsenanza, aDefensa, aCiencias}
var maxx = -Infinity;
var variablesMasAltass = [];
var variableMaximaa = "";

for (var variablee in variabless) {
  var valorActuall = variabless[variablee];

  if (valorActuall > maxx) {
    maxx = valorActuall;
    variablesMasAltass = [{ nombre: variablee, valor: valorActuall }];
    variableMaximaa = variablee;
  } else if (valorActuall === maxx) {
    variablesMasAltass.push({ nombre: variablee, valor: valorActuall });
  }
}

console.log("El valor máximo de aptitudes es: " + maxx);
console.log("Variable de aptitudes con el valor máximo: " + variableMaximaa);

if (variablesMasAltass.length > 1) {
  console.log("Variables de aptitudes con el mismo valor máximo:");
  variablesMasAltass.forEach(function (variablee) {
    console.log(variablee.nombre + ": " + variablee.valor);
  });
}

if (max === 0 && maxx === 0){
  res.render('resultadosNull.ejs');
}

res.render('resultados.ejs', { 
  respuestas: variablesMasAltas, 
  variableMaxima: variableMaxima, 
  interesesResulta: interesesResulta, 
  variablesAptitudes: variablesMasAltass,
  aptitudesResulta: aptitudResulta
});

}



  