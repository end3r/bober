require('dotenv').config();
require('@nomicfoundation/hardhat-toolbox');

const { PRIVATE_KEY, CELO_FORNO_RPC } = process.env;

module.exports = {
  solidity: '0.8.17',
  networks: {
    celo: {
      url: CELO_FORNO_RPC || 'https://forno.celo.org',
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      timeout: 60000
    },
    alfajores: {
      url: process.env.ALF_RPC || 'https://alfajores-forno.celo-testnet.org',
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      timeout: 60000,
      chainId: 44787
    }
  }
};
