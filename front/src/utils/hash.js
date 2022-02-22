let SparkMD5 = require("spark-md5")

// 生成文件 hash
export function createdHash(fileChunkList) {
  return new Promise((resolve, reject) => {
    const spark = new SparkMD5.ArrayBuffer()
    let count = 0
    const loadNext = index => {
      const reader = new FileReader()
      reader.readAsArrayBuffer(fileChunkList[index].file)
      reader.onload = e => {
        count++
        spark.append(e.target.result)
        if (count === fileChunkList.length) {
          resolve(spark.end())
        }else{
          loadNext(count)
        }
      }
    }
    loadNext(0)
  })
}

