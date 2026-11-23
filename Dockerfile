FROM electronuserland/builder:wine

WORKDIR /project

# Using entrypoint to keep it flexible
ENTRYPOINT ["/bin/bash", "-c"]
CMD ["npm install && mkdir -p node_modules/sqlite3/prebuilds && curl -L -o node_modules/sqlite3/prebuilds/sqlite3-v6.0.1-napi-v36-win32-x64.tar.gz https://github.com/TryGhost/node-sqlite3/releases/download/v6.0.1/sqlite3-v6.0.1-napi-v6-win32-x64.tar.gz && curl -L -o node_modules/sqlite3/prebuilds/sqlite3-v6.0.1-napi-v36-win32-ia32.tar.gz https://github.com/TryGhost/node-sqlite3/releases/download/v6.0.1/sqlite3-v6.0.1-napi-v6-win32-ia32.tar.gz && npm run build-win"]
