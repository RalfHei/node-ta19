const express = require('express');
const app = express();

const http = require('http').createServer(app);
const socketio = require('socket.io');
const io = socketio(http)


const session = require('express-session');
const redis = require('redis');
const connectRedis = require('connect-redis');

var bodyParser = require('body-parser');
const path = require('path');

// config
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/public', express.static(path.join(__dirname, '/public')));

// redis server
const RedisStore = connectRedis(session);

//Configure redis client
const redisClient = redis.createClient({
  host: 'localhost',
  port: 6379
})

redisClient.on('error', function (err) {
  console.log('Could not establish a connection with redis. ' + err);
});
redisClient.on('connect', function (err) {
  console.log('Connected to redis successfully');
});

const sessionMiddleWare = session({
  store: new RedisStore({ client: redisClient }),
  secret: 'secret$%^134',
  resave: false,
  saveUninitialized: false,
  cookie: {
      secure: false, // if true only transmit cookie over https
      httpOnly: false, // if true prevent client side JS from reading the cookie 
      maxAge: 1000 * 60 * 60 * 24 // session max age in miliseconds
  }
});

app.use(sessionMiddleWare);

 io.use((socket, next) => {
   sessionMiddleWare(socket.request, {}, next);
 });

app.get("/", (req, res) => {
  sess = req.session;
  if (sess.username && sess.password) {
      sess = req.session;
      if (sess.username) {
        res.sendFile(__dirname + '/public/index.html');
      }
  } else {
      res.sendFile(__dirname + "/public/login.html");
  }
});

app.post("/login", (req, res) => {
  sess = req.session;
  sess.username = req.body.username
  sess.password = req.body.password
  // add username and password validation logic here if you want. If user is authenticated send the response as success
  res.end("success")
});

app.get("/logout", (req, res) => {
  req.session.destroy(err => {
      if (err) {
          return console.log(err);
      }
      res.redirect("/")
  });
});

io.on('connection', (socket) => {
    // const sess = socket.request.session

    // console.log(sess.username, socket.id, 'a user connected');

    io.emit('connection', socket.id);
    socket.on('chat_message', (msg) => {
        io.emit('chat_message', msg);
    });
});

http.listen(8000, () => {
  console.log('listening on *:3000');
});

