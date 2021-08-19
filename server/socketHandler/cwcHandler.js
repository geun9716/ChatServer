const redisClient = require('../Loader/Redis');
const { RedisSessionStore } = require("../Loader/sessionStore");
const { RedisMessageStore } = require("../Loader/messageStore");
const { RedisRoomStore} = require('../Loader/roomStore');
const roomStore = new RedisRoomStore(redisClient);
const sessionStore = new RedisSessionStore(redisClient);
const messageStore = new RedisMessageStore(redisClient);

module.exports = async(io, socket) => {
  // persist session
  sessionStore.saveSession(socket.sessionID, {
    userID: socket.userID,
    username: socket.username,
    connected: true,
  });

  // emit session details
  socket.emit("session", {
    sessionID: socket.sessionID,
    userID: socket.userID,
  });

  const connect = async(data) => {
    // we store the username in the socket session for this client
    socket.username = data.username;
    socket.profile = data.profile;
    socket.room = data.room;
    socket.isAdmin = data.isAdmin?data.isAdmin:0;
    
    socket.join(socket.room);
    //room 정보 변경
    const usernum = await roomStore.joinUsersRoom(socket.room, {
      username : socket.username, 
      profile : socket.profile, 
      isAdmin : socket.isAdmin
    });
    console.log(usernum);

    const messages = await roomStore.findMessagesForRoom(socket.room);
    //자신이 속한 room Set을 반환 Set은 socketId를 갖고 있음.
    // const clients = await io.in(socket.room).allSockets();
    // console.log("connected : "+socket.username+" Room #"+socket.room+" : "+clients.size);
    
    socket.emit('login', {
      usernum : usernum,
      messages : messages,
    });
    
    socket.to(socket.room).emit('user joined', {
      username : socket.username,
      userNum : usernum[1],
    });
  }

  const newMessage = ({ user, content }) => {
    const now = new Date();
    var hours = now.getHours();
    var minutes = now.getMinutes();
    if(hours < 10){hours = "0" + hours;}
    if(minutes < 10){minutes = "0" + minutes;}
    console.log(`${user.username} : ${content} in ${socket.room} on ${hours}:${minutes}`);
    // we tell the client to execute 'new message'
    const msg = {
        user: {
          username : socket.username,
          profile : socket.profile,
          isAdmin : socket.isAdmin
        },
        timestamp : hours+":"+minutes,
        message: content
    }
    roomStore.saveMessages(socket.room, msg);
    socket.to(socket.room).emit('new message', msg);
  }

  const reconnect = (data) => {
    // we store the username in the socket session for this client
    socket.username = data.username;
    socket.profile = data.profile;
    socket.room = data.room;
    socket.isAdmin = data.isAdmin?data.isAdmin:0;

    socket.join(socket.room);
    
    //io 서버에 생성된 rooms 를 보여줌.
    //console.log(io.sockets.adapter.rooms); 
    
    //자신이 속한 room Set을 반환 Set은 socketId를 갖고 있음.
    io.in(socket.room).allSockets()
      .then((clients)=>{
        console.log("connected : "+socket.username+" Room #"+socket.room+" : "+clients.size);
        const data = {
          username : socket.username,
          userNum : clients.size,
        }
        socket.emit('reconnect', data);
        socket.to(socket.room).emit('user joined', data);
    });
  }

  const disconnecting = async() => {
    console.log('disconnecting');
    const result = await roomStore.leaveUsersRoom(socket.room, {
      username : socket.username, 
      profile : socket.profile, 
      isAdmin : socket.isAdmin
    });
    console.log(result);
  }

  const disconnect = () => {
    //자신이 속한 room Set을 반환 Set은 socketId를 갖고 있음.
    // const clients = io.sockets.adapter.rooms.get(socket.room);
    io.in(socket.room).allSockets()
    .then((clients)=>{
        const data = {
          username : socket.username,
          userNum : clients.size,
        };
        if (clients)
        console.log("disconnected : "+socket.username+" Room #"+socket.room+" : "+clients.size);
        else
        console.log("disconnected : "+socket.username+" Room #"+socket.room +" is Empty.");
        socket.to(socket.room).emit('user left', data);
    }); 
  }
  // when the client emits 'add user', this listens and executes
  socket.on('add user', connect);

  // when the client emits 'new message', this listens and executes
  socket.on('new message', newMessage);

  socket.on('reconnect', reconnect);

  //when the user disconnecting.. perform this
  socket.on('disconnecting', disconnecting);
  // when the user disconnects.. perform this
  socket.on('disconnect', disconnect);

}