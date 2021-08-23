class RoomStore {
  saveMessages(message) {}
  findMessagesForRoom(roomID) {}
}

const CONVERSATION_TIL = 24 * 60 * 60;
const mapRoom = ([roomID, roomname, usernum]) => roomID ? { roomID, roomname, usernum} : undefined;
  
class RedisRoomStore extends RoomStore {
  constructor(redisClient){
      super();
      this.redisClient = redisClient;
  }

  createRoom = async(data) => {
    console.log("CREATE ROOM : "+JSON.stringify(data));
    return await this.redisClient.hmset(`room:${data.roomID}`, data);
  }

  findAllRoom = async() =>{
    //room키 가져오기
    const keys = new Set();
    let nextIndex = 0;
    do {
      const [nextIndexAsStr, results] = await this.redisClient.scan(
        nextIndex,
        "MATCH",
        "room:*",
        "COUNT",
        "100"
      );
      nextIndex = parseInt(nextIndexAsStr, 10);
      results.forEach((s) => keys.add(s));
    } while (nextIndex !== 0);

    // room 정보 가져오기
    const commands = [];
    keys.forEach((key) => {
      commands.push(['hgetall', key]);
      commands.push(['scard', `user:${key.substring(5)}`]);
    });

    return this.redisClient
      .multi(commands)
      .exec()
      .then((results) => {
        const rooms = [];
        while (results.length > 0){
          const roominfo = results.shift()[1];
          const usernum = results.shift()[1];
          roominfo['usernum'] = usernum;
          rooms.push(roominfo);
        }
        return rooms;
      }).catch((err)=>{
        console.log(err);
        return 0;
      })
  }

  findRoom = async(id) => {
    const result = await this.redisClient.hgetall(`room:${id}`);
    return (result.constructor === Object && Object.keys(result).length===0)?false:result;
  }

  deleteRoom = async(id) => {
    return await Promise.all([this.redisClient.del(`room:${id}`), this.redisClient.del(`user:${id}`),this.redisClient.del(`msg:${id}`)])
      .then((value)=>{
        console.log(value);
      }).catch((error)=>{
        console.log(error);
      });
  }

  findMessagesForRoom(roomID) {
    return this.redisClient
      .lrange(`msg:${roomID}`, 0, -1)
      .then((result) => {
          return result.map((result) => JSON.parse(result));
      });
  }

  saveMessages(roomID, message) {
    const value = JSON.stringify(message);
    return this.redisClient
      .multi()
      .rpush(`msg:${roomID}`, value)
      .expire(`msg:${roomID}`, CONVERSATION_TIL)
      .exec();
  }

  getUsersRoom(roomID=1){
    return this.redisClient
      .smembers(`user:${roomID}`)
      .then((result)=>{
        return result.map((result)=> JSON.parse(result));
      })
  }
  
  getUsersNum = (roomID=1)=>{ 
    return this.redisClient.scard(`user:${roomID}`,(err, result)=>{
      return result;
    });
  }
  
  joinUsersRoom(roomID, user){
    const value = JSON.stringify(user);
    return this.redisClient
      .multi()
      .sadd(`user:${roomID}`, value)
      .expire(`user:${roomID}`, CONVERSATION_TIL)
      .exec();
  }

  leaveUsersRoom = async(roomID, user) => {
    const value = JSON.stringify(user);
    return this.redisClient
      .multi()
      .srem(`user:${roomID}`, value)
      .exec();
  }
}

module.exports = {
    RedisRoomStore,
}