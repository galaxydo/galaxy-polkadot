# galaxy-polkadot

Galaxy (Milestone 2) is a web application built with React, allowing users to create, save, and load scenes using Excalidraw, IPFS, and Polkadot.

## Development Prerequisites

### Node.js
- **Version**: v18 or later
- [Download Node.js](https://nodejs.org/)
- Check version with: `node --version`

### Deno
- **Version**: v1.36 or later
- [Install Deno](https://docs.deno.com/runtime/manual/getting_started/installation)
- Check version with: `deno --version`

### pnpm (Recommended)
- Install with: `npm install -g pnpm`
- Check version with: `pnpm --version`

### Docker (Optional)
- [Download Docker](https://www.docker.com/)
- Check version with: `docker --version`

### cargo-contract (Optional)
- Install with: `cargo install --force --locked cargo-contract`
- Check version with: `cargo contract --version`

## Setup

These instructions will help you set up the project on your local machine for development and testing purposes.

```
git clone https://github.com/7flash/galaxy-polkadot.git
cd galaxy-polkadot
git checkout milestone2
git submodule update --init --recursive
pnpm install
```

## Frontend

To run the unit tests for the project, follow these steps:

1. **Start the frontend development server:**

```bash
pnpm dev-frontend
```

2. **In a new terminal tab, run the tests:**

```bash
pnpm test-frontend
```

Upon executing, you should observe an output resembling:

```
PASS  tests/Galaxy.test.js (28.307 s)
Galaxy Macros Engine
    ✓ JS Macros (4340 ms)
    ✓ Deno macros (4270 ms)
    ✓ Python macros (5137 ms)
    ✓ Open Macro (4846 ms)
    ✓ Publish Macro (4805 ms)
    ✓ Save Macro (3877 ms)

Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total
Snapshots:   0 total
Time:        28.367 s
```

## Backend

When focusing on the backend aspect of the project (specifically the `main.ts`), follow these steps:

1. **Start the backend development server:**

```bash
pnpm dev-deno
```

If you made modifications in the frontend while working on the backend, you'll need to rebuild both together to reflect the frontend changes:

2. **Rebuild both frontend and backend together:**

```bash
pnpm dev-desktop
```

### excalidraw-assets

In production mode, backend will load recent frontend build from public repository, and then spawn a browser window.

In development mode, instead it will read frontend build locally from ./dist submodule folder.

In case, after running dev-desktop, it does not produce excalidraw-assets in ./dist folder as expected, run the following command to copy it manually from recent release:

```
cp ./node_modules/@galaxydo/excalidraw/dist/excalidraw-assets ./dist
```

Accordingly, if you made changes in excalidraw submodule, make sure to rebuild it.

```
cd excalidraw/src/packages/excalidraw && yarn build:umd
```

Then publish a new release to registry, and update dependency in package.json to your version.

### webui

In production mode, **deno-webui** package loads static library **webui** from public a repository, resolving to the file corresponding to the target platform.

In development mode, local library path must be specified in [main.ts](https://github.com/7flash/galaxy-desktop-app/blob/9763b504caf094f1f4000300185c9594a05b560e/main.ts#L8)

In case, the path of webui compiled library on your platform differs from default path, you must compile it manually (make sure to have cpp installed) and then update libPath parameter above.

```
cd desktop/webui && make
```

## Release

To release the project, execute the following commands in sequence:

1. **Build for release:**

```bash
pnpm release-first
```

2. **Compile for macOS:**

```bash
pnpm release-second
```

3. **Run the build script:**

```bash
pnpm release-third
```

Executing these commands in order ensures that the project is built, compiled, and prepared for release appropriately.

## Docker (Frontend)

**Docker Limitations:**

Docker image only suitable for running and testing frontend app. It also allows to define and execute frontend-side JS macros, including "publish" macro which invokes wallet transaction to publish layer.

But since backend is designed to launch a default user browser installed on local machine, docker is not suitable for running backend app.

In case of testing backend-side Deno macros, such as "save" macro to save layers in persistent local database, please either follow instructions above to run full app locally, or simply install recent release build, which already includes deno engine (but does not include chromium and still depends on user default browser and its default profile with installed wallet extension) 

**Build Image:**
```bash
docker build -t galaxy:latest .
```

**Run Application:**
```bash
docker run -d -p 8080:80 galaxy:latest
```

Open [http://localhost:8080](http://localhost:8080) in your browser.



## Contract

### Compile locally

Ensure the latest version:

```
cd contract
git pull && git checkout main
```

Compile source to galaxy.wasm

```
cargo contract build
```

### Rococo Deployment

The Galaxy Contract has been deployed on the Rococo testnet.

- **Contract Address**: 
   ```
   5E1zfVZmokEX29W9xVzMYJAzvwnXWE7AVcP3d1rXzWhC4sxi
   ```

After new deployment, ensure to update the address in [GalaxyAPI.ts](https://github.com/7flash/galaxy-polkadot/blob/a551fc37d0c91c453aa6d04e40fd5d66edb0bb02/src/GalaxyAPI.ts#L43).

## License

This project is licensed under the MIT License.
