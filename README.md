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

## License

This project is licensed under the MIT License.
