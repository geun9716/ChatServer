const httpServer = require("http").createServer();
const { setupWorker } = require("@socket.io/sticky");
const redisClient = require('./Loader/Redis');
const io = require("socket.io")(httpServer, {
  cors: {
    origin: "http://localhost:8080",
  },
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
  const username = socket.handshake.auth.username;
  if (!username) {
    return next(new Error("invalid username"));
  }
  socket.sessionID = randomId();
  socket.userID = randomId();
  socket.username = username;
  console.log(`sessionID : ${socket.sessionID}, userID : ${socket.userID}, username : ${socket.username}`);
  next();
}

/* socket.io namespace routes */

const chat_io = io.of('/chat');

chat_io.use(async(socket, next) =>sessionCheck(socket, next));
const chatHandler = require('./socketHandler/chatHandler');

chat_io.on('connection', (socket)=>(chatHandler(chat_io, socket)));
setupWorker(io);
