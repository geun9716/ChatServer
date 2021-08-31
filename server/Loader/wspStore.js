class wspStore {
    saveMessages(message) {}
    findMessagesForRoom(roomID) {}
  }
  
  const CONVERSATION_TIL = 24 * 60 * 60;
    
  class RedisWspStore extends wspStore {
    constructor(redisClient){
        super();
        this.redisClient = redisClient;
    }
  
    findMessagesForWsp(wspID) {
      return this.redisClient
        .lrange(`wsp:${wspID}`, 0, -1)
        .then((result) => {
            return result.map((result) => JSON.parse(result));
        });
    }
  
    saveMessages(wspID, message) {
      const value = JSON.stringify(message);
      return this.redisClient
        .multi()
        .rpush(`wsp:${wspID}`, value)
        .expire(`wsp:${wspID}`, CONVERSATION_TIL)
        .exec();
    }

    deleteWsp(wspID) {
      return this.redisClient
        .del(`wsp:${wspID}`);
    }
  
    // getUsersRoom(roomID=1){
    //   return this.redisClient
    //     .smembers(`user:${roomID}`)
    //     .then((result)=>{
    //       return result.map((result)=> JSON.parse(result));
    //     })
    // }
    
    // getUsersNum = (roomID=1)=>{ 
    //   return this.redisClient.scard(`user:${roomID}`,(err, result)=>{
    //     return result;
    //   });
    // }
    
    // joinUsersRoom(roomID, user){
    //   const value = JSON.stringify(user);
    //   return this.redisClient
    //     .multi()
    //     .sadd(`user:${roomID}`, value)
    //     .expire(`user:${roomID}`, CONVERSATION_TIL)
    //     .exec();
    // }
  
    // leaveUsersRoom = async(roomID, user) => {
    //   const value = JSON.stringify(user);
    //   return this.redisClient
    //     .multi()
    //     .srem(`user:${roomID}`, value)
    //     .exec();
    // }
  }
  
  module.exports = {
      RedisWspStore,
  }