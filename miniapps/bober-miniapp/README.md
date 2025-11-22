# Bober MiniApp (Celo / Farcaster)

Minimal MiniApp wrapper to integrate the `bober` game with Celo and Farcaster.

Purpose
- Provide a lightweight MiniApp shell that can auto-connect a wallet and perform two on-chain actions:
  - Tip (send cUSD/CELO to a project wallet)
  - Mint a small ERC-721 "badge" when a player reaches a high score

What I scaffolded
- `public/index.html` — static wrapper that loads the MiniApp UI and exposes integration hooks.
- `public/miniapp.js` — small integration script using `ethers` (CDN) to connect to an injected wallet and call contract methods.
- `contracts/TipBadge.sol` — simple ERC-721 contract skeleton to mint badges and withdraw tips.
- `hardhat.config.js` — placeholder Hardhat config for Celo networks (you must supply RPC key/PRIVATE_KEY in `.env`).

Next steps (recommended)
1. Decide whether to copy the game files into `miniapps/bober-miniapp/public/` or host the game separately and point the MiniApp at the live URL.
2. Replace `CONTRACT_ADDRESS` inside `public/miniapp.js` with your deployed contract address after deploying the provided `TipBadge.sol`.
3. Install Hardhat and dependencies in this folder to compile/deploy the contract:

```bash
cd miniapps/bober-miniapp
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox @openzeppelin/contracts dotenv
```

4. Update `.env` with `PRIVATE_KEY` and `ALCHEMY_API_KEY` (or use Celo Forno RPC) and run the deployment script (create one if needed).
5. Integrate the Farcaster wagmi connector: the current `miniapp.js` uses a simple injected `window.ethereum` approach for clarity; to meet ETHGlobal Celo qualification you should wire the Farcaster wagmi connector per their docs.

Notes
- This is a minimal starting point. For production and qualification you will want to:
  - Add Farcaster `wagmi` connector and auto-connect logic.
  - Use Celo-specific payment tokens (cUSD) if desired and proper token transfer logic.
  - Verify the contract on Celo mainnet explorer after deployment (qualification requirement).

If you want, I can now:
- Copy the current game files into `public/` and wire calls from the game to `window.miniapp.mintBadge(score)` when a highscore is reached.
- Add a Hardhat deployment script and run it (you must provide private key and funds).
