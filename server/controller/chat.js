import redisClient from '../Loader/Redis';
import httpStatus from 'http-status-codes';
const { RedisRoomStore} = require('../Loader/roomStore');
const roomStore = new RedisRoomStore(redisClient);
const crypto = require("crypto");
const randomId = () => crypto.randomBytes(8).toString("hex");
// 게시글 조회
const getAllRoom = async(req, res) => {
    try {
        const rooms = await roomStore.findAllRoom();
        res.status(httpStatus.OK).send(rooms.sort((a, b)=>{
            return b.usernum - a.usernum;
        }));
    } catch(error) {
        console.error(error, "GET Room All api error")
        res.status(httpStatus.INTERNAL_SERVER_ERROR).send([])
    }
}

const getRoom = async(req, res) => {
    let id = req.params.id;
    try {
        const room = await roomStore.findRoom(id);
        console.log(JSON.stringify(room));
        if (room) {
            res.status(httpStatus.OK).send({
                'success' : true,
                "room": room
            });  
        } else {
            res.status(httpStatus.NOT_FOUND).send({
                'success':false,
                'msg' : `There is no Room`
            });  
        }
          
    } catch(error) {
        console.error(error, "GET Room Id api error")
        res.status(httpStatus.INTERNAL_SERVER_ERROR).send([])
    }
}

const createRoom = async(req, res) => {
    const data = req.body;
    data['roomID'] = randomId();
    try{
        const result = await roomStore.createRoom(data);
        console.log(result);
        res.status(httpStatus.OK).send({
            success:result=="OK"?true:false,
            roomInfo : data
        });
    } catch (error) {
        console.error(error, "CREATE Room api error")
        res.status(httpStatus.INTERNAL_SERVER_ERROR).send(error)
    }
}

const deleteRoom = async(req, res) => {
    let id = req.params.id;
    try {
        const result = await roomStore.deleteRoom(id);
        res.status(httpStatus.OK).send({success: result?true:false, msg: result?`Delete Room ${id}`:`Can't find Room ${id}`});    
    } catch(error) {
        console.error(error, "DELETE Room api error")
        res.status(httpStatus.INTERNAL_SERVER_ERROR).send([])
    }
}

export default {
    getAllRoom,
    getRoom,
    createRoom,
    deleteRoom,
}