# vite-nft-auction-contract
A general NFT auction contract written with Solidity++ 0.8.0+.

Features:
1. support English auction and Dutch auction.
2. work with ERC-721 standard.
3. Users can configure extensive parameters for flexibility. E.g. reserved price, auction type, start/end date, initial/final price, etc.
4. Complete test.

# Getting Started
```
npm install
npm test
```
# Test Environments

Open `test/vite.node.json` and edit `defaultNode` to switch test environment.

- **Release Environment**:
Contracts are deployed on local network running the release version of gvite.

- **Beta Environment**:
Contracts are deployed on local network running the beta version of gvite.

- **Nightly Environment**: 
Contracts are deployed on local network running the nightly version of gvite.
