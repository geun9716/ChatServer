import express from 'express';
import chatRoute from './chat';

const router = express.Router()

router.get('/', (req, res) => {
    res.send('welcome to API root');
})

router.use("/chat", chatRoute)


module.exports = router;