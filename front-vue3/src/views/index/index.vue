<template>
    <div class="container">
        <div class="title">
            <h2>大文件上传服务器</h2>
        </div>
        <el-form ref="form" :model="form" label-width="80px">
            <el-form-item label="切片大小">
                <el-input v-model="chunkSize" placeholder="切片大小，至少1m以上"></el-input>
            </el-form-item>
        </el-form>
        <el-upload
            class="upload-file"
            ref="upload"
            action=""
            :on-change="filtChange"
            :on-remove="handleRemove"
            :file-list="fileList"
            :auto-upload="false">
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
import { reactive, ref, computed } from 'vue'
import { ElMessage } from 'element-plus'

import { upload, merge, verify } from "@/api/index"
import { createdHash } from "@/utils/hash"

export default {
    name: 'Index',
    setup() {
        let fileList = reactive([])
        let chunkSize = ref(1) // 用户输入切片大小，至少1m大小
        const SIZE = computed(() => {
            return Number(chunkSize.value) * 1024 * 1024 //10m切片大小
        })
        let loading = ref(false)
        const form = {
            file:undefined,
            hash:undefined,
            worker:undefined
        }
        // 每个切片对应的数据包
        let queryArr = []
        // 进行文件切片操作
        const createFileChunk = ( file, size = SIZE.value ) => {
            const fileChunkList = []
            let cur = 0
            while (cur < file.size) {
                // 对file进行切片,返回Bolb对象{size:***,type:***}
                // 如果文件超过10m，则按10m每个切片进行分割
                fileChunkList.push({file: file.slice(cur, cur + size)}) // 讲file分10m截取内容,然后push进fileChunkList数组里面 [{file:Blob{size:**,type:**}}]
                cur += size //一定要写这个累加,不然死循环
            }
            return fileChunkList
        }
        // 进行文件计算 hash (web-worker)
        const calculateHash = async (fileChunkList) => {
            return createdHash(fileChunkList)
        }
        // 校验是否上传过文件
        const verifyUpload = async (filename, fileHash) => {
            const { data } = await verify({ filename, fileHash })
            return data
        }
        // 选择文件
        const filtChange = (file, fileArr) => {
            const { raw } = file
            if( !raw ) {
                ElMessage.error("未选择文件")
                console.log("未选择文件")
                return
            }
            console.log("选择了文件")
            form.file = raw
            fileList = fileArr
        }
        // 上传切片文件
        const uploadChunks = (uploadedList = []) => {
            // 简写
            const requestList = queryArr
                .filter(({ hash }) => !uploadedList.includes(hash)) //过滤已上传的切片
                .map(({ chunk, hash, index }) => {
                    const formData = new FormData()
                    formData.append("chunk", chunk)
                    formData.append("hash", hash)
                    formData.append("filename", form.file.name)
                    formData.append("fileHash", form.hash)
                    return { formData, index }
                })
                .map(async ({ formData }) => {
                    await upload(formData)
                })
            Promise.all(requestList).then(()=>{
                console.log("上传完成了")
                fileMerge()
            }) //并发切片

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
        }
        // 上传文件
        const fileUpload = async () => {
            if(!form.file) {
                ElMessage.error("无文件可上传")
                console.log("无文件可上传")
                return
            }
            loading.value = true
            // 文件切片
            const fileChunkList = createFileChunk(form.file)
            // 生成文件对应的hash值
            form.hash = await calculateHash(fileChunkList)
            // 校验文件
            const { shouldUpload, uploadedList } = await verifyUpload(form.file.name, form.hash)
            if(!shouldUpload) {
                loading.value = false
                ElMessage.success("文件已经上传成功")
                return
            }
            // 定义上传切片hash包
            queryArr = fileChunkList.map( ({file}, index) => ({
                fileHash: form.hash,  // 文件对应的hash值,标识
                index,
                chunk:file,
                size:file.size,
                hash: `${form.hash}-${index}`
            }))
            // 上传切片
            uploadChunks(uploadedList)
        }
        // 合并文件
        const fileMerge = async () => {
            const params = {
                size:SIZE.value,
                fileHash:form.hash,
                filename:form.file.name
            }
            const { data } = await merge(params)
            console.log("合并成功")
            ElMessage.success("上传成功")
            loading.value = false
        }

        // 删除文件
        const handleRemove = (file, fileArr) => {
            console.log("删除")
            fileList = []
            form.file = undefined
        }

        return {
            fileList,
            chunkSize,
            filtChange,
            fileUpload,
            fileMerge,
            handleRemove,
            loading
        }
    }
}
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
            width: 500px;
            margin-bottom: 30px;
        }
    }
</style>
