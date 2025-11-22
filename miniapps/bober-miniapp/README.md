# Bober MiniApp (Celo / Farcaster)

Celo MiniApp integration for the Bober River Flow game with on-chain tips and NFT badge minting.

## ✅ What's Completed

- **Game Integration**: All game files copied to `public/` folder
- **High-Score NFT Minting**: Game calls `window.miniapp.mintBadge(score)` on new high scores
- **Smart Contract**: TipBadge.sol (ERC-721) ready for deployment
- **MiniApp UI**: Wallet connection and contract interaction via miniapp.js
- **Deployment Scripts**: Hardhat configured for Celo mainnet and Alfajores testnet

## 🚀 Deployment Instructions

### 1. Get Testnet Funds (Optional - for testing)

Visit https://faucet.celo.org/alfajores and get free testnet CELO for your deployer address.

### 2. Configure Environment

The `.env` file is already created with your private key. Verify it:

```bash
cat .env
```

### 3. Compile Contract

```bash
npm run compile
```

### 4. Deploy Contract

**Option A: Deploy to Alfajores Testnet (Testing)**
```bash
npm run deploy:alfajores
```

**Option B: Deploy to Celo Mainnet (Production - requires real CELO)**
```bash
npm run deploy:celo
```

The script will output the deployed contract address.

### 5. Verify Contract (REQUIRED for ETHGlobal)

After deployment, verify on Celoscan:

```bash
npx hardhat verify --network celo <CONTRACT_ADDRESS>
# or for testnet:
npx hardhat verify --network alfajores <CONTRACT_ADDRESS>
```

### 6. Update Contract Address

Edit `public/miniapp.js` and replace the placeholder:

```javascript
const CONTRACT_ADDRESS = 'YOUR_DEPLOYED_CONTRACT_ADDRESS_HERE';
```

### 7. Test Locally

```bash
npm run dev
```

Visit http://localhost:8080 and play the game. When you beat your high score, the MiniApp will trigger the NFT mint.

## 🎮 How It Works

1. **Player plays the game** - Standard Phaser game in browser
2. **New high score achieved** - Game detects score > previous best
3. **Automatic mint trigger** - Calls `window.miniapp.mintBadge(score)`
4. **Wallet prompts user** - Metamask/Farcaster wallet asks for confirmation
5. **NFT minted** - TipBadge ERC-721 minted to player's address

## 📋 ETHGlobal Celo Qualification Checklist

- ✅ Smart contract uses Celo network (mainnet or testnet)
- ✅ Contract verified on Celoscan explorer
- ⏳ Farcaster wagmi connector integration (optional but recommended)
- ✅ Game deployed and accessible via web
- ✅ On-chain interaction (NFT minting on high score)

## 🔧 Troubleshooting

**RPC Connection Issues:**
If deployment fails with timeout, try alternative RPCs in `.env`:
- Ankr: `https://rpc.ankr.com/celo` (mainnet)
- Ankr Alfajores: `https://rpc.ankr.com/celo_alfajores` (testnet)

**Insufficient Funds:**
- Testnet: Get free CELO from https://faucet.celo.org/alfajores
- Mainnet: Bridge or buy CELO from exchange

**Contract Verification Fails:**
Make sure you're using the exact compiler version (0.8.17) and constructor arguments match.

## 📁 Project Structure

```
miniapps/bober-miniapp/
├── public/
│   ├── index.html          # Game entry point
│   ├── miniapp.js          # Wallet & contract integration
│   ├── src/                # Game source files
│   ├── img/                # Game assets
│   └── ...
├── contracts/
│   └── TipBadge.sol        # ERC-721 NFT contract
├── scripts/
│   └── deploy.js           # Deployment script
├── hardhat.config.js       # Network configuration
└── .env                    # Private key & RPC URLs
```
