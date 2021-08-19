const express = require('express');
const app = express();
const cors = require('cors');

const fs = require('fs');
const path = require('path');
const httpsServer = require("https").createServer({
    key : fs.readFileSync(path.join(__dirname, 'config', 'key.pem')),
    cert : fs.readFileSync(path.join(__dirname, 'config', 'cert.pem')),
}, app);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use('/api', require('./api/index'));

const redisClient = require('./Loader/Redis');
const io = require("socket.io")(httpsServer, {
  cors: {origin: "*"},
  adapter: require("socket.io-redis")({
    pubClient: redisClient,
    subClient: redisClient.duplicate(),
  }),
});

/* session Check */
const { RedisSessionStore } = require("./Loader/sessionStore");
const sessionStore = new RedisSessionStore(redisClient);
const crypto = require("crypto");
const randomId = () => crypto.randomBytes(8).toString("hex");

const sessionCheck = async (socket, next) => {
  const sessionID = socket.handshake.auth.sessionID;
  if (sessionID) {
    const session = await sessionStore.findSession(sessionID);
    if (session) {
      socket.sessionID = sessionID;
      socket.userID = session.userID;
      socket.username = session.username;
      return next();
    }
  }
  const mem_id = socket.handshake.auth.mem_id;
  const username = socket.handshake.auth.username;
  if (!username) {
    return next(new Error("invalid username"));
  }
  console.log(mem_id);
  socket.sessionID = randomId();
  socket.userID = mem_id?mem_id:randomId();
  socket.username = username;
  console.log(`sessionID : ${socket.sessionID}, userID : ${socket.userID}, username : ${socket.username}`);
  next();
}

/* socket.io namespace routes */

const chat_io = io.of('/chat');
const cwc_io = io.of('/cwc_chat');
const wsp_io = io.of('/wsp_chat');

chat_io.use(async(socket, next) => sessionCheck(socket, next));
cwc_io.use(async(socket, next) => sessionCheck(socket, next));

const chatHandler = require('./socketHandler/chatHandler');
const cwcHandler = require('./socketHandler/cwcHandler');
const wspHandler = require('./socketHandler/wspHandler');

chat_io.on('connection', (socket)=>(chatHandler(chat_io, socket)));
cwc_io.on('connection', (socket)=>cwcHandler(cwc_io, socket));
wsp_io.on('connection', (socket)=>wspHandler(wsp_io, socket));

// setupWorker(io);

const PORT = process.env.PORT || 12345;

httpsServer.listen(PORT, () =>
  console.log(`server listening at https://localhost:${PORT}`)
);

module.exports=app;