# 超级宠物网页版

桌面上的一只宠物。页面用 Vue 3、TypeScript 和 Tailwind CSS。聊天连接 DeepSeek，形象连接通义千问 Qwen-Image。整理文件夹会在你确认后移动文件。手机上的事会拆成步骤，发送、付款和删除会停下来等你点头。

目录：

- `src/components` 页面区块
- `src/composables` 宠物状态和小窗
- `src/api` 本机接口
- `src/lib` 整理文件夹和本地存储
- `server` DeepSeek 与 Qwen-Image 转发
- `shared` 分类和办事计划

## 启动

在项目根目录：

```bash
npm install
copy .env.example .env
npm run dev
```

浏览器打开 http://127.0.0.1:5173

`.env` 里填写：

- `DEEPSEEK_API_KEY`：DeepSeek 开放平台的密钥
- `DASHSCOPE_API_KEY`：阿里云百炼的密钥
- `DASHSCOPE_REGION`：北京密钥填 `cn`，国际站密钥填 `intl`

也可以不写文件，在页面右上角「密钥」里填写。密钥留在这台浏览器里，由本机服务转发。

## 四个页面

1. 聊天：和宠物说话。提到整理、换样子或手机办事时，会打开对应页面。
2. 形象：用 Qwen-Image 2.0、2.0 Pro、Plus 或初代 Qwen-Image 生成宠物样子，并设成当前形象。
3. 整理：用 Chrome 或 Edge 选择桌面文件夹。只移动最外面一层的文件，放进「图片」「文档」等子文件夹。
4. 办事：描述要在自己手机上完成的事。宠物列出打开、点按、输入和核对。密码、验证码由你自己输入。

Chrome 或 Edge 里可以点「浮到桌面上」，宠物会待在一个单独的小窗里。浏览器菜单里的「安装应用」可以把网页装到桌面。

## 检查

```bash
npm test
npm run typecheck
```
