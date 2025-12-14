FROM node:latest AS builder

RUN mkdir -p /workspace
WORKDIR /workspace
RUN npm config set registry https://registry.npmmirror.com
RUN git clone https://github.com/setube/ogame-vue-ts.git
RUN mv ./ogame-vue-ts/* . ; rm -rf ./ogame-vue-ts/

RUN npm install -g pnpm ; pnpm install;
RUN pnpm build

# --- 第二阶段：Nginx ---
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /workspace/docs /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]