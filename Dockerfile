# IM Growth Audit — frontend (Next.js, bağımsız çıktı). BACKEND_URL derleme sırasında yönlendirmelere işlenir.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG BACKEND_URL=http://backend:3001
ENV BACKEND_URL=$BACKEND_URL BUILD_STANDALONE=1 NEXT_TELEMETRY_DISABLED=1
RUN npx next build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000 NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://127.0.0.1:3000/login || exit 1
CMD ["node", "server.js"]
