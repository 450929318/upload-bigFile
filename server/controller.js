const multiparty = require("multiparty")
const path = require("path")
const fse = require("fs-extra");

const extractExt = filename => filename.slice(filename.lastIndexOf("."), filename.length); // 提取后缀名

const UPLOAD_DIR = path.resolve(__dirname, "target"); // 切片存储目录 C:\Users\zsds\Desktop\uploadServer\target

const resolvePost = req => {
    return new Promise(resolve => {
        let chunk = ""
        req.on("data", data => {
            chunk += data
        })
        req.on("end", () => {
            resolve(JSON.parse(chunk))
        })
    })
}

const pipeStream = (path, writeStream) => {
    // console.log("path",path) // 带后缀路径
    return new Promise(resolve => {
        const readStream = fse.createReadStream(path) //读取文件流返回对象
        readStream.on("end", () => {
            fse.unlinkSync(path) //读取完毕之后删除当前切片
            resolve()
        })
        readStream.pipe(writeStream) // 管道流pipe  读取的内容写入生成文件
    })
}

// 合并切片
const mergeFileChunk = async (filePath, fileHash, size) => {
    const chunkDir = path.resolve(UPLOAD_DIR, fileHash) //文件目录路径 C:\Users\zsds\Desktop\uploadServer\target\认证视频
    const chunkPaths = await fse.readdir(chunkDir)  //读取文件夹下的所有文件，返回数组[]
    // 根据切片下标进行排序
    // 否则直接读取目录的获得的顺序可能会错乱
    chunkPaths.sort((a, b) => a.split("-")[1] - b.split("-")[1])
    console.log("所有切片文件:",chunkPaths)
    await Promise.all(
        // 遍历数组文件，读写每个文件内容，依次覆盖上一个文件内容，最后生成需要携带后缀的文件
        chunkPaths.map((chunkPath, index)=> {
                return pipeStream(
                    path.resolve(chunkDir, chunkPath), // C:\Users\zsds\Desktop\uploadServer\target\认证视频.mp4\认证视频.mp4-0
                    // 指定位置创建可写流 、 生成的文件路径，加后缀
                    fse.createWriteStream(filePath, { 
                        start: index * size,
                        end: (index + 1) * size
                    })
                )
            }
        )
    )
    fse.rmdirSync(chunkDir) // 合并后删除保存切片的目录
}

// 返回前端格式
const resData = (res, data={}) => {
    const resQuery = {
        code:200,
        data,
        msg:'success'
    }
    res.json(resQuery)
}

// 返回已经上传切片名
const createUploadedList = async fileHash => {
    return fse.existsSync(path.resolve(UPLOAD_DIR, fileHash)) ? await fse.readdir(path.resolve(UPLOAD_DIR, fileHash)): []
}

module.exports = class {
    // 接收处理切片
    async handleFormData(req, res) {
        const multipart = new multiparty.Form()
        multipart.parse(req, async (err, fields, files) => {
            if( err ) throw err
            const [ chunk ] = files.chunk
            const [ hash ] = fields.hash
            const [ fileHash ] = fields.fileHash
            const [ filename ] = fields.filename
            
            const filePath = path.resolve(UPLOAD_DIR, `${fileHash}}`)

            const chunkDir = path.resolve(UPLOAD_DIR, fileHash)
            
            // 文件存在直接返回
            if (fse.existsSync(filePath)) {
                resData(res,{message:'文件已经存在'})
                return
            }

            // 切片目录不存在，创建切片目录
            if (!fse.existsSync(chunkDir)) {
                await fse.mkdirs(chunkDir)
            }

            // fs-extra 专用方法，类似 fs.rename 并且跨平台
            // fs-extra 的 rename 方法 windows 平台会有权限问题
            // https://github.com/meteor/meteor/issues/7852#issuecomment-255767835
            await fse.move(chunk.path, path.resolve(chunkDir, hash))
            resData(res)
        })
    }

    // 合并切片
    async handleMerge(req, res) {
        const data = await resolvePost(req)
        console.log("data",data)
        const { fileHash, filename, size } = data
        const ext = extractExt(filename) // 提取文件后缀名  .mp4
        const filePath = path.resolve(UPLOAD_DIR, `${fileHash}${ext}`)
        console.log("合并切片路径filePath:",filePath)
        await mergeFileChunk(filePath, fileHash, size)
        resData(res,{message:"合并成功"})
    }

    // 校验文件
    async handleVerify(req, res) {
        const data = await resolvePost(req)
        const { fileHash, filename } = data
        const ext = extractExt(filename)
        const filePath = path.resolve(UPLOAD_DIR, `${fileHash}${ext}`) // 加ext是文件，不加是目录路径
        console.log("切片保存路径filePath:",filePath)
        console.log(`${fse.existsSync(filePath)?'文件目录存在':'文件目录不存在'}`)
        // 判断切片目录是否存在，不存在则创建切片目录
        if (fse.existsSync(filePath)) {
            resData(res, {shouldUpload: false})
        }else{
            resData(res, {shouldUpload: true,uploadedList: await createUploadedList(fileHash)})
        }
    }
}