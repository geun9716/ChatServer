import express from 'express';
import chatRoute from './chat';
import wspRouter from './wsp';
const router = express.Router()

router.get('/', (req, res) => {
    res.send('welcome to API root');
})

router.use("/chat", chatRoute)
router.use("/wsp", wspRouter)


module.exports = router;