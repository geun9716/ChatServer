import db from '../Loader/db';
const redisClient = require('../Loader/Redis');
const { RedisWspStore} = require('../Loader/wspStore');
const wspStore = new RedisWspStore(redisClient);
module.exports = (io, socket) => {
    let addedUser = false;

    const connect = async(data) => {
        if (addedUser) return;
        // we store the username in the socket session for this client
        socket.username = data.username;
        socket.profile = data.profile;
        socket.room = data.room;
        socket.isAdmin = data.isAdmin?data.isAdmin:0;
        addedUser = true;
        socket.join(socket.room);
        
        //io 서버에 생성된 rooms 를 보여줌.
        //console.log(io.sockets.adapter.rooms);

        //자신이 속한 room Set을 반환 Set은 socketId를 갖고 있음.
        const clients = await io.in(socket.room).allSockets();
        console.log("connected : "+socket.username+" Room #"+socket.room+" : "+clients.size);
        const messages = await wspStore.findMessagesForWsp(socket.room);
        const msg = {
            username : socket.username,
            userNum : clients.size,
            messages : messages,
        }
        socket.emit('login', msg);
        socket.to(socket.room).emit('user joined', msg);
    }

    const newMessage = (data) => {
        console.log(`${socket.username} : ${data} in ${socket.room}`);
        const now = new Date();
        var hours = now.getHours();
        var minutes = now.getMinutes();
        if(hours < 10){hours = "0" + hours;}
        if(minutes < 10){minutes = "0" + minutes;}
        // we tell the client to execute 'new message'
        const msg = {
            user: {username : socket.username, profile : socket.profile, isAdmin : socket.isAdmin},
            timestamp : hours+":"+minutes,
            message: data
        }
        wspStore.saveMessages(socket.room, msg);
        socket.to(socket.room).emit('new message', msg);
    }

    const reconnect = (data) => {
        if (addedUser) return;
        // we store the username in the socket session for this client
        socket.username = data.username;
        socket.profile = data.profile;
        socket.room = data.room;
        socket.isAdmin = data.isAdmin?data.isAdmin:0;

        addedUser = true;
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

    const quit = async() => {
        const wspID = socket.room;
        const messages = await wspStore.findMessagesForWsp(wspID);
        // console.log(JSON.stringify(messages));
        const result = await db.query(`UPDATE cb_worship SET wsp_chat = ? WHERE wsp_id = ?;`, [JSON.stringify(messages), wspID]);
        // console.log(result);
        wspStore.deleteWsp(wspID);
        //quit
        io.to(wspID).emit('quit');
        io.disconnectSockets(wspID);
    }

    const disconnecting = () => {

    }

    const disconnect = () => {
        if (addedUser) {
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
    }
    // when the client emits 'add user', this listens and executes
    socket.on('add user', connect);

    // when the client emits 'new message', this listens and executes
    socket.on('new message', newMessage);

    socket.on('reconnect', reconnect);

    socket.on('quit', quit);

    //when the user disconnecting.. perform this
    socket.on('disconnecting', () => {
    });
    // when the user disconnects.. perform this
    socket.on('disconnect', disconnect);
}