const express = require("express")
const logger = require("morgan")
const bodyParser = require("body-parser")
const passport = require("passport")
const pe = require("parse-error")
const cors = require("cors")

const api = require("./routes/api")
const app = express()

const APP_CONFIG = require("./config/app_config")

app.use(logger("dev"))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.set("view engine", "pug")
// app.use(cookieParser());
// app.use(express.static(path.join(__dirname, 'public')));

//Passport
app.use(passport.initialize())

//Log Env
console.log("Environment:", APP_CONFIG.app)

//DATABASE
const models = require("./models")
models.sequelize
  .authenticate()
  .then(() => {
    console.log("Connected to SQL database:", APP_CONFIG.db_name)
  })
  .catch(err => {
    console.error("Unable to connect to SQL database:", APP_CONFIG.db_name, err)
  })
if (APP_CONFIG.app === "dev") {
  models.sequelize.sync() //creates table if they do not already exist
  // models.sequelize.sync({ force: true });//deletes all tables then recreates them useful for testing and development purposes
}
// CORS
app.use(cors())
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*")
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  )
  res.header("X-Powered-By", "WebhadeCreative")
  if (req.method === "OPTIONS") {
    res.header("Access-Control-Allow-Methods", "PUT, POST, PATCH, DELETE, GET")
    return res.status(200).json({})
  }
  next()
})

app.use("/api", api)

app.use("/", function(req, res) {
  res.statusCode = 200 //send the appropriate status code
  res.json({ status: "success", message: "Parcel Pending API", data: {} })
})

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error("Not Found")
  err.status = 404
  next(err)
})

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get("env") === "development" ? err : {}

  // render the error page
  res.status(err.status || 500)
  res.send(err.stack)
})

module.exports = app

//This is here to handle all the uncaught promise rejections
process.on("unhandledRejection", error => {
  console.error("Uncaught Error", pe(error))
})
