# galaxy-polkadot

Galaxy (Milestone 1) is a web application built with React, allowing users to create, save, and load scenes using Excalidraw and IPFS.

## Table of Contents

- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Application](#running-the-application)
- [Running the Tests](#running-the-tests)
- [License](#license)

## Getting Started

These instructions will help you set up the project on your local machine for development and testing purposes.

### Prerequisites

- Node.js (v14.x.x or later)
- yarn (v1.22.x or later)
- Docker (optional, for deployment)

### Installation

1. Clone the repository:

```
https://github.com/7flash/galaxy-polkadot.git
cd galaxy-polkadot
```

2. Install the dependencies:

```
yarn install
```

### Running the Application

1. Start the development server:

```
yarn dev
```

2. Open your browser and navigate to `http://localhost:5173`.

## Running the Tests

```
yarn test
```

### Running IPFS locally (optional)

1. Mount a host directory with the -v option to Docker. 

```
export ipfs_staging=</absolute/path/to/somewhere/>
export ipfs_data=</absolute/path/to/somewhere_else/>
```

2. Start a container running ipfs and expose ports 4001 (P2P TCP/QUIC transports), 5001 (RPC API) and 8080 (Gateway):

```
docker run -d --name ipfs_host -v $ipfs_staging:/export -v $ipfs_data:/data/ipfs -p 4001:4001 -p 4001:4001/udp -p 127.0.0.1:8080:8080 -p 127.0.0.1:5001:5001 ipfs/kubo:latest
```

3. Update src/config.ts

```
export const ipfsApiUrl = "http://localhost:5001"
export const ipfsGatewayUrl = "http://localhost:8080"
```

## License

This project is licensed under the MIT License.
