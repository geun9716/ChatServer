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

  createRoom = async({roomID, roomname, usernum = 0}) => {
    console.log(roomID, roomname, usernum);
    return await this.redisClient.hmset(`room:${roomID}`, {
      "roomID" : roomID,
      "roomname" : roomname,
      "usernum" : usernum
    });
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
    
    //room 정보 가져오기
    const commands = [];
    keys.forEach((key) => {
      commands.push(['hmget', key, "roomID", "roomname", "usernum"]);
    });
    return this.redisClient
      .multi(commands)
      .exec()
      .then((results) => {
        return results
          .map(([err, room]) => (err ? undefined : mapRoom(room)))
          .filter((v) => !!v);
      });
  }

  findRoom = async(id) => {
    const result = await this.redisClient.hgetall(`room:${id}`);
    return (result.constructor === Object && Object.keys(result).length===0)?false:result;
  }

  deleteRoom = (id) => {
    return this.redisClient.del(`room:${id}`);
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

  getUsersRoom(roomID){
    return this.redisClient
      .smembers(`users:${roomID}`)
      .then((result)=>{
        return result.map((result)=> JSON.parse(result));
      })
  }
  
  getUsersNum = (roomID)=>{ 
    return this.redisClient.scard(`users:${roomID}`);
  }
  
  joinUsersRoom(roomID, user){
    const value = JSON.stringify(user);
    return this.redisClient
      .multi()
      .hincrby(`room:${roomID}`, 'usernum', 1)
      .sadd(`user:${roomID}`, value)
      .expire(`user:${roomID}`, CONVERSATION_TIL)
      .exec()
      .then((results)=>{
        return results[0];
      });
  }

  leaveUsersRoom = async(roomID, user) => {
    const value = JSON.stringify(user);
    return this.redisClient
      .multi()
      .hincrby(`room:${roomID}`, 'usernum', -1)
      .srem(`user:${roomID}`, value)
      .exec()
      .then((result)=>{
        return result[0];
      });
  }
}

module.exports = {
    RedisRoomStore,
}