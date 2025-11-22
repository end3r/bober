const hre = require('hardhat');

async function main() {
  console.log('Deploying TipBadge contract to Celo...');
  
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying with account:', deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log('Account balance:', hre.ethers.formatEther(balance), 'CELO');
  
  const TipBadge = await hre.ethers.getContractFactory('TipBadge');
  const contract = await TipBadge.deploy();
  
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  
  console.log('\n✅ TipBadge deployed to:', address);
  console.log('\nNext steps:');
  console.log('1. Update CONTRACT_ADDRESS in public/miniapp.js with:', address);
  console.log('2. Verify contract on Celo Explorer (REQUIRED for ETHGlobal qualification):');
  console.log('   npx hardhat verify --network celo', address);
  console.log('3. Test minting by calling mintBadge from the MiniApp UI.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
