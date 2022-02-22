<template>
    <div class="container">
        <div class="title">
            <h2>大文件上传服务器</h2>
        </div>
        <el-form ref="form" label-width="80px" class="form">
            <el-form-item label="切片大小">
                <el-input v-model="size" placeholder="切片大小，至少1m以上"></el-input>
            </el-form-item>
        </el-form>
        <el-upload
            class="upload-file"
            ref="upload"
            action=""
            :on-change="filtChange"
            :on-remove="handleRemove"
            :file-list="fileList"
            :multiple="true"
            :auto-upload="false"
            >
            <template #trigger>
                <el-button size="small" type="primary" plain>选取文件</el-button>
            </template>
            <el-button style="margin-left: 10px;" size="small" type="success" plain @click="fileUpload" :loading="loading">上传到服务器</el-button>
            <!-- <template #tip>
                <div class="el-upload__tip">只能上传jpg/png文件，且不超过500kb</div>
            </template> -->
        </el-upload>
    </div>
</template>

<script>
import { upload, merge, verify } from "@/api/index";
import { createdHash } from "@/utils/hash";
export default {
    name: "Index",
    data: () => ({
        container: {
            file: null,
            hash: "",
            worker: null,
        },
        cont: [],
        size:10,  // 1 * 1024 * 1024; //1m切片大小
        fileList:[],
        loading:false
    }),
    computed:{
        chunkSize() {
            return Number(this.size) * 1024 * 1024
        }
    },
    methods: {
        // 选择文件
        async filtChange(file, fileArr) {
            if(!fileArr?.length) {
                this.$message.error("未选择文件")
                return
            }
            this.fileList = fileArr
        },
        // 删除文件
        handleRemove(file, fileArr) {
            if(file.hasOwnProperty('uid')) {
                for (let index in this.fileList) {
                    if (this.fileList[index].uid === file.uid) {
                        this.fileList.splice(index, 1)
                        return
                    }
                }
            }
        },
        // 上传
        async fileUpload() {
            if (!this.fileList.length) {
                this.$message.error("无文件可上传")
                return
            }
            // this.fileListData.map(item => {
            //     item.status = "uploading"
            //     item.percentage = 50
            // })
            // return
            
            this.loading = true
            const files = this.fileList
            files.map( async ItemRaw => {
                const item = ItemRaw.raw
                // 文件切片
                const fileChunkList = this.createFileChunk(item)
                item.hash = await this.calculateHash(fileChunkList)
                console.log("hash标记完成")
                // 校验文件
                const { shouldUpload, uploadedList } = await this.verifyUpload(
                    item.name,
                    item.hash
                )
                if (!shouldUpload) {
                    this.loading = false
                    console.log("已经存在文件不执行")
                    return
                }
                // 定义上传切片hash包
                this.cont = fileChunkList.map(({ file }, index) => ({
                    fileHash: item.hash,
                    index,
                    chunk: file,
                    size: file.size,
                    hash: `${item.hash}-${index}`,
                }))
                // 上传
                this.uploadChunks(uploadedList, item)
                return item
            })
        },

        // 生成切片
        createFileChunk(file, size = this.chunkSize) {
            const fileChunkList = []
            let cur = 0
            console.log("文件切片中...")
            while (cur < file.size) {
                // 对file进行切片，返回Bolb对象{size:***,type:**}
                // 如果文件超过10m，则按10m每个切片进行分割
                fileChunkList.push({ file: file.slice(cur, cur + size) })
                cur += size
                console.log(`当前切片：${cur}/${file.size}`)
            }
            console.log("文件切片完成")
            return fileChunkList
        },

        // 生成文件 hash（web-worker）
        calculateHash(fileChunkList) {
            console.log("切片标注hash中..")
            return createdHash(fileChunkList)
        },

        // 根据 hash 验证文件是否曾经已经被上传过,没有才进行上传
        async verifyUpload(filename, fileHash) {
            console.log("文件校验中...")
            try {
                const { data } = await verify({ filename, fileHash })
                console.log("文件校验完成")
                return data
            } catch (error) {
                this.$message.error("文件校验失败")
                return { code: 500 }
            }
        },

        // 上传切片
        async uploadChunks(uploadedList = [], fileItem) {
            console.log("切片上传中...")
            const requestList = this.cont
                .filter(({ hash }) => !uploadedList.includes(hash)) //过滤已上传的切片
                .map(({ chunk, hash, index }) => {
                    const formData = new FormData()
                    formData.append("chunk", chunk)
                    formData.append("hash", hash)
                    formData.append("filename", fileItem.name)
                    formData.append("fileHash", fileItem.hash)
                    return { formData, index }
                })
                .map(async ({ formData }) => {
                    await upload(formData)
                    console.log("切片上传完成")
                })
            //并发切片
            await Promise.all(requestList).then(() => {
                this.mergeRequest(fileItem) // 合并文件
            }) 
            
            // 解析写法
            // 过滤已经上传的切片, 遍历query中的每一项hash与服务器上的每一个hash对比,如果存在则不上传该切片
            // const requestList = queryArr.filter(({ hash }) => !uploadedList.includes(hash)) //过滤返回还是数组
            // // 再进行遍历发送切片到服务器
            // const reqArr = requestList.map(({chunk, hash, index}) => {
            //     const formData = new FormData()
            //     formData.append("chunk", chunk)
            //     formData.append("hash", hash)
            //     formData.append("filename", form.file.name)
            //     formData.append("fileHash", form.hash)
            //     return { formData, index }
            // })
            // // 处理好每一项formData数据之后 进行每一个切片发送请求
            // reqArr.map(async ({formData}) => {
            //     await upload(formData)
            // })
            // Promise.all(reqArr)
        },

        // 合并文件
        async mergeRequest(fileItem) {
            const params = {
                size: this.chunkSize,
                fileHash: fileItem.hash,
                filename: fileItem.name
            }
            console.log("文件合并中...")
            try {
                await merge(params)
                console.log("文件合并完成")
                this.loading = false
            } catch (error) {
                this.loading = false
                console.log("上传失败")
            }
        }
    }
};
</script>
<style lang="scss" scoped>
    .container{
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        .title{
            margin-bottom: 60px;
        }
        .form {
            width: 300px;
            margin-bottom: 30px;
        }
    }
</style>
