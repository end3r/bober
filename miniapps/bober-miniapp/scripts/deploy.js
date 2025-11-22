const hre = require('hardhat');

async function main() {
  console.log('Deploying TipBadge contract...');
  
  const TipBadge = await hre.ethers.getContractFactory('TipBadge');
  const contract = await TipBadge.deploy();
  
  await contract.deployed();
  
  console.log('TipBadge deployed to:', contract.address);
  console.log('\nNext steps:');
  console.log('1. Update CONTRACT_ADDRESS in public/miniapp.js with:', contract.address);
  console.log('2. Verify contract on explorer (required for ETHGlobal Celo qualification):');
  console.log('   npx hardhat verify --network celo', contract.address);
  console.log('3. Fund the deployer address with CELO to cover gas for minting.');
  console.log('4. Test minting by calling mintBadge from the MiniApp UI.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
