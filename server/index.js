const express = require('express')
const router = require('./router')
const app = express()
const port = 3001

app.all('*', function(req, res, next){
    //设置允许跨域的域名，*代表允许任意域名跨域
    res.header("Access-Control-Allow-Origin","*")
    //允许的header类型
    res.header("Access-Control-Allow-Headers","content-type")
    //跨域允许的请求方式 
    res.header("Access-Control-Allow-Methods","DELETE,PUT,POST,GET,OPTIONS")
    if (req.method == 'OPTIONS') {
        res.header('Access-Control-Allow-Headers', req.headers['access-control-request-headers'])
        res.sendStatus(200); /*让options请求快速返回*/
    }else {
        next()
    }
})

app.use('/api', router)

app.listen(port, ()=>{
    console.log(`server listen in ${port}`)
})