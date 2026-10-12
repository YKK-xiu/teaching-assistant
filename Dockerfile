FROM node:20-slim

WORKDIR /app

# 安装依赖
COPY package.json ./
RUN npm install --omit=dev

# 复制应用代码
COPY . .

# 创建数据目录
RUN mkdir -p /app/data/uploads

# 数据持久化卷
VOLUME ["/app/data"]

# 环境变量
ENV PORT=3000
ENV NODE_ENV=production

# 暴露端口
EXPOSE 3000

# 启动
CMD ["node", "server.js"]
