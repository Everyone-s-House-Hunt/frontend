FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
# clean install ちゃんと依存関係を見るやつ
RUN npm ci 

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
