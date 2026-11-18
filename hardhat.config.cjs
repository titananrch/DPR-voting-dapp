require('dotenv').config()
require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      // Hardhat's built-in default chain ID. Declared explicitly so the node,
      // wallet, and frontend (viem `localhost`, also 1337) cannot drift apart.
      // Verified empirically: eth_chainId returns 0x539 (1337).
      chainId: 1337,
    },
    hardhat: {
      chainId: 1337
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC || "",
      accounts: process.env.PRIVATE_KEY
        ? [process.env.PRIVATE_KEY]
        : [],
    },
  },
};
