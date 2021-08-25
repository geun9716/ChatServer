const fs = require('fs');
const redisClient = require('../Loader/Redis');
const { RedisSessionStore } = require("../Loader/sessionStore");
const { RedisMessageStore } = require("../Loader/messageStore");
const { RedisRoomStore} = require('../Loader/roomStore');
const roomStore = new RedisRoomStore(redisClient);
const sessionStore = new RedisSessionStore(redisClient);


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

  const connect = async({room, data}) => {
    // we store the data in the socket session for this client
    socket.room = room;
    socket.info = data;
    
    console.log('room : '+socket.room);
    console.log(JSON.stringify(socket.info));
    //join room
    socket.join(socket.room);
    //join user in room    
    const join = await roomStore.joinUsersRoom(socket.room, socket.info);
    // console.log(join);
    //get usernum in room
    const usernum = await roomStore.getUsersNum(socket.room);
    //get messages in room
    const messages = await roomStore.findMessagesForRoom(socket.room);
    //자신이 속한 room Set을 반환 Set은 socketId를 갖고 있음.
    // const clients = await io.in(socket.room).allSockets();
    // console.log("connected : "+socket.username+" Room #"+socket.room+" : "+clients.size);
    
    //emit data for login client
    socket.emit('login', {
      usernum : usernum,
      messages : messages,
    });
    //emit data for other current client
    socket.to(socket.room).emit('user joined', {
      username : socket.username,
      userNum : usernum,
    });
  }

  const newMessage = ({content}) => {
    const now = new Date();
    var hours = now.getHours();
    var minutes = now.getMinutes();
    const timestamp = now.toISOString();
    if(hours < 10){hours = "0" + hours;}
    if(minutes < 10){minutes = "0" + minutes;}
    // we tell the client to execute 'new message'
    const msg = {
        info : socket.info,
        timestamp : hours+":"+minutes,
        message: content
    }
    console.log(JSON.stringify(msg));
    roomStore.saveMessages(socket.room, msg);
    roomStore.updateRoom(socket.room, {updateTime:timestamp});
    socket.to(socket.room).emit('new message', msg);
  }

  const getUsers = async() => {
    const users = await roomStore.getUsersRoom(socket.room);
    console.log(users);
    socket.emit('getUsers', users);
  }

  const quit = async() => {
    const room = socket.room;
    const messages = await roomStore.findMessagesForRoom(room);
    fs.writeFile(`public/files/room_${socket.room}.txt`, JSON.stringify(messages), (err)=>{
      if(err) return console.log(err);
      console.log(`public/files/room_${socket.room}.txt`);
    });
    console.log('')
    roomStore.deleteRoom(room);
    //quit
    io.to(room).emit('quit');
    io.disconnectSockets(room);
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
    const result = await roomStore.leaveUsersRoom(socket.room, socket.info);
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

  socket.on('getUsers', getUsers);

  socket.on('reconnect', reconnect);

  socket.on('quit', quit);

  //when the user disconnecting.. perform this
  socket.on('disconnecting', disconnecting);
  // when the user disconnects.. perform this
  socket.on('disconnect', disconnect);

}