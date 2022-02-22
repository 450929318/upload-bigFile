const express = require('express')
const router = express.Router()
const Controller = require("./controller")

const controller = new Controller()

// router.get('/test', async (req, res) => {
//     const qur = req.query
//     const resQuery = {
//         code:200,
//         data: cont
//     }
//     res.json(resQuery)
// })

router.post('/upload', (req, res) => {
    controller.handleFormData(req, res)
})

router.post('/merge', (req, res) => {
    controller.handleMerge(req, res)
})

router.post('/verify', (req, res) => {
    controller.handleVerify(req, res)
})

module.exports = router