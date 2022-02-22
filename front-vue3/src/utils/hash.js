const SparkMD5 = require("spark-md5")

// 生成文件 hash
export function createdHash(fileChunkList) {
    return new Promise((resolve, reject)=> {
        const spark = new SparkMD5.ArrayBuffer()
        let count = 0
        const loadNext = index => {
            // 参考: https://developer.mozilla.org/zh-CN/docs/Web/API/FileReader
            const reader = new FileReader() // 允许Web应用程序异步读取存储在用户计算机上的文件（或原始数据缓冲区）的内容,使用 File 或 Blob 对象指定要读取的文件或数据
            reader.readAsArrayBuffer(fileChunkList[index].file) // 开始读取指定的 Blob中的内容, 一旦完成, result 属性中保存的将是被读取文件的 ArrayBuffer 数据对象
            reader.onload = e => {  // 该事件在读取操作完成时触发。
                count++
                spark.append(e.target.result) // 将每一个读取到的文件Buffer添加到 spark中生成hash
                // 递归循环添加
                if (count === fileChunkList.length) {
                    resolve(spark.end())  //最后结束 返回一个 结合后的hash值
                }else{
                    loadNext(count)
                }
            }
        }

        // 开始执行
        loadNext(0)
    })
}