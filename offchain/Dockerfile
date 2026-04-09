FROM oven/bun:latest AS deps
WORKDIR /app

COPY offchain/package.json package.json
COPY packages/shared/ vista-bridge-shared/

# Replace workspace:* with file ref, add override to pin libsodium, strip devDeps
RUN bun -e "const p=JSON.parse(require('fs').readFileSync('package.json','utf8')); p.dependencies['@vista-bridge/shared']='file:./vista-bridge-shared'; p.overrides={'libsodium-wrappers-sumo':'0.7.10'}; delete p.devDependencies; require('fs').writeFileSync('package.json',JSON.stringify(p,null,2));"

RUN bun install && rm -rf node_modules/.bun node_modules/.cache

# --- Runtime ---
FROM oven/bun:latest
WORKDIR /app

COPY --from=deps /app/node_modules node_modules
COPY packages/shared/ node_modules/@vista-bridge/shared/
COPY offchain/ .

EXPOSE 3001
CMD ["bun", "run", "src/main.ts"]
