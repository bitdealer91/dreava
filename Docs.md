# 📘 Dreava Launchpad — Technical Overview

## 🎯 Mission

**Dreava** is a Web3 launchpad built for creators to easily deploy NFT collections, manage sales phases (Whitelist, FCFS, Public), and mint tokens with advanced UI — all on **Somnia Testnet**, fully ready for mainnet.

---

## 🔧 Smart Contract Architecture

### 1. SomniaNFT (ERC721 Custom)

* Based on OpenZeppelin ERC721URIStorage
* Minting Phases:

  * NotActive, WhiteList, FCFS, Public
* Integrated:

  * `mintPublic`, `mintWhiteList`, `mintBatchPublic`
  * `claimReserved()` from preloaded IPFS URIs
  * `IERC2981` royalty support (default: 5%)
  * `contractURI()` for OpenSea compatibility

#### Key Features:

* Custom minting limits per address
* Max supply defined at creation (immutable)
* Royalty fee + platform commission
* Reserved on-chain claimable NFTs
* `onlyAuthorized` roles (owner + platform)

### 2. SomniaFactory (Collection Creator)

* Deploys collections with one call
* Stores metadata per collection:

  * Address, name, symbol, timestamp, verification status
* Keeps `allCollections`, `userCollections`
* Public access to collection list and info
* Verifiable contracts (for Launchpad filtering)

#### Advanced Features:

* Default parameters (editable):

  * `defaultMaxMint`, `defaultWLPrice`, `defaultPublicPrice`
* Emergency pause
* Optimized for low bytecode size (🧳 < 24kb for mainnet)

---

## 🖼️ Frontend (React + Tailwind)

### Technologies:

* React 18 + Vite
* Tailwind CSS 4
* `@tanstack/react-query` (data caching)
* `wagmi` + `ethers.js` (Web3 interactions)
* `Pinata IPFS` for file & metadata upload

### Features:

* Create Collection (with image preview)
* Select Collection → Mint NFT (Single, Multi, JSON)
* Attribute builder (Add, Remove)
* Queue status preview (in Multiple mode)
* Auto UI blocking until collection is selected

---

## 💸 Minting Logic Summary

| Phase    | Access       | Function          | Payment Required  |
| -------- | ------------ | ----------------- | ----------------- |
| WL       | Whitelisted  | `mintWhiteList()` | Yes (wlPrice)     |
| FCFS     | Open         | (Planned)         | TBD               |
| Public   | Everyone     | `mintPublic()`    | Yes (publicPrice) |
| Reserved | Pre-uploaded | `claimReserved()` | Yes (publicPrice) |

---

## ✅ Marketplace Compatibility

| Standard      | Supported? | Notes                                |
| ------------- | ---------- | ------------------------------------ |
| ERC721        | ✅          | Core token format                    |
| IERC2981      | ✅          | Royalty for OpenSea, LooksRare, etc  |
| contractURI() | ✅          | For OpenSea collection page metadata |
| JSON Metadata | ✅          | IPFS-stored per NFT + collection     |

---

## 🔐 Security & Compliance

* Uses `nonReentrant` on payable functions
* Immutables: maxSupply is locked at creation
* Owner-only: withdraw, whitelist, phase control
* Verifiable deployment: all collections visible in factory
* Hardhat/Remix compiler optimized (runs: 50)

---

## 🧩 Extensibility Ideas

* `FCFS` mint logic (time-based)
* On-chain metadata support
* Marketplace smart contract for listing + fees
* Bridge to Somnia Mainnet / L2 networks
* Dynamic pricing (e.g. Dutch auctions)

---

## 🧠 Summary

Dreava is a full-featured Web3 NFT launchpad and minting framework, with:

* Production-ready smart contracts
* Seamless mint flow
* Royalty & phase control
* Factory-based deployment
* Full OpenSea & IPFS compatibility

> Built for creators, ready for marketplaces.
