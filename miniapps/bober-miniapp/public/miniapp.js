// Minimal MiniApp integration script
// Exposes simple connect, tip and mint functionality using ethers and an injected wallet (window.ethereum).

(function(){
  const CONTRACT_ADDRESS = 'REPLACE_WITH_YOUR_CONTRACT_ADDRESS';
  const ABI = [
    // minimal ABI: mintBadge(address,uint256) and withdraw
    "function mintBadge(address to, uint256 tokenId) public",
    "function withdraw() public",
    "function owner() public view returns (address)"
  ];

  const statusEl = document.getElementById('status');
  const connectBtn = document.getElementById('connect');
  const tipBtn = document.getElementById('tip');
  const mintBtn = document.getElementById('mint');

  let provider = null;
  let signer = null;

  function setStatus(s){ if(statusEl) statusEl.textContent = s; }

  async function connect(){
    if(window.ethereum){
      try{
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        const addr = await signer.getAddress();
        setStatus('Connected: ' + addr.slice(0,8));
      } catch(e){
        console.error('connect error', e);
        setStatus('Connection failed');
      }
    } else {
      setStatus('No injected wallet');
    }
  }

  async function tip(){
    if(!signer){ setStatus('Connect first'); return; }
    try{
      // tipping in cUSD would require interacting with cUSD contract; here we send native CELO as simple example
      const tx = await signer.sendTransaction({ to: (await signer.getAddress()), value: ethers.utils.parseEther('0.01') });
      setStatus('Tipped — tx sent');
      await tx.wait();
      setStatus('Tip confirmed');
    } catch(e){ console.error(e); setStatus('Tip failed'); }
  }

  async function mintBadge(){
    if(!signer){ setStatus('Connect first'); return; }
    if(CONTRACT_ADDRESS === 'REPLACE_WITH_YOUR_CONTRACT_ADDRESS'){ setStatus('Set contract address in miniapp.js'); return; }
    try{
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      // Example: mint to caller with tokenId = current timestamp (demo only)
      const to = await signer.getAddress();
      const tokenId = Math.floor(Date.now() / 1000);
      const tx = await contract.mintBadge(to, tokenId);
      setStatus('Mint tx sent');
      await tx.wait();
      setStatus('Badge minted!');
    } catch(e){ console.error(e); setStatus('Mint failed'); }
  }

  connectBtn && connectBtn.addEventListener('click', connect);
  tipBtn && tipBtn.addEventListener('click', tip);
  mintBtn && mintBtn.addEventListener('click', mintBadge);

  // expose global hooks for the game to call when needed
  window.miniapp = {
    connect,
    tip,
    mintBadge,
    setStatus
  };

  // auto-attempt connect if wallet is already injected and unlocked
  window.addEventListener('load', async ()=>{
    // TODO: replace with Farcaster wagmi connector for qualification
    // See: https://miniapps.farcaster.xyz/docs/guides/wallets
    if(window.ethereum && window.ethereum.selectedAddress){
      await connect();
    }
  });

  // NOTE: To meet ETHGlobal Celo qualification, replace the above with Farcaster wagmi connector:
  // 1. Install wagmi + viem: npm install wagmi viem @wagmi/connectors
  // 2. Use createConfig with farcasterConnector per https://miniapps.farcaster.xyz/docs/guides/wallets
  // 3. Call autoConnect() on page load to auto-connect Farcaster wallet.
  // Example snippet (requires bundler):
  // import { createConfig, http } from 'wagmi';
  // import { celo } from 'wagmi/chains';
  // import { farcasterConnector } from '@wagmi/connectors/farcaster';
  // const config = createConfig({ chains: [celo], connectors: [farcasterConnector()], transports: { [celo.id]: http() } });
  // await config.autoConnect();
})();
