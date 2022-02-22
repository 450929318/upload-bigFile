## 说明
```bash
1.接收前端上传文件保存当前目录下
2.需要先安装三个依赖
    # 【ssh 模块（可实现连接服务器、命令调用等常见操作）】
    npm install archiver@5.3.0   (参考版本)

    # 【文件压缩 模块（可实现 .zip 等常见压缩文件的本地打包）】
    npm install node-ssh@11.1.1   (参考版本)

    # 【命令行选择 模块（可实现对多配置项文件进行选择和使用）】
    npm install inquirer@8.1.1   (参考版本)
```
## 开发
```bash
# 安装依赖
npm install

# 启动服务
node index.js
```