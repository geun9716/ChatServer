import chat from '../controller/chat';
var express = require('express');
var router = express.Router();
/**
 * image 등록이 필요한 경우
 */
// var multer = require('multer') // 
// var storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, 'public/images');
//       },
//       filename: function (req, file, cb) {
//         cb(null, Date.now() + '-' + file.originalname);
//       }
// })
// // var upload = multer({ dest: 'uploadedFiles/' }); // 3-1
// var upload = multer({ storage: storage }); // 3-2

/* GET users listing. */
router.get('/', chat.getAllRoom);
router.get('/:id', chat.getRoom);
router.post('/', chat.createRoom);
router.delete('/:id', chat.deleteRoom);

module.exports = router;