import redisClient from '../Loader/Redis';
import httpStatus from 'http-status-codes';
const { RedisWspStore} = require('../Loader/wspStore');
const wspStore = new RedisWspStore(redisClient);
// 예배 채팅 내역 조회
const getWsp = async(req, res) => {
    let id = req.params.id;
    try {
        const messages = await wspStore.findMessagesForWsp(id);
        console.log(JSON.stringify(messages));
        if (messages) {
            res.status(httpStatus.OK).send({
                'success' : true,
                "messages": messages
            });  
        } else {
            res.status(httpStatus.NOT_FOUND).send({
                'success':false,
                'msg' : `There is no Message`
            });
        }
    } catch(error) {
        console.error(error, "GET Wsp Id api error")
        res.status(httpStatus.INTERNAL_SERVER_ERROR).send([])
    }
}

const deleteWsp = async(req, res) => {
    let id = req.params.id;
    try {
        const messages = await wspStore.findMessagesForWsp(id);
        fs.writeFile(`public/files/wsp_${socket.room}.txt`, JSON.stringify(messages), (err)=>{
        if(err) return console.log(err);
            console.log(`public/files/wsp_${socket.room}.txt`);
        });
        wspStore.deleteWsp(id);
        res.status(httpStatus.OK).send({success: result?true:false, msg: result?`Delete Wsp ${id}`:`Can't find Wsp ${id}`});
    } catch(error) {
        console.error(error, "DELETE Wsp api error")
        res.status(httpStatus.INTERNAL_SERVER_ERROR).send([])
    }
}

export default {
    // getAllRoom,
    getWsp,
    // createWsp,
    deleteWsp,
}