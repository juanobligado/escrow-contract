import {task} from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import { HardhatUserConfig } from "hardhat/config";
import '@typechain/hardhat'
import '@nomiclabs/hardhat-ethers'


task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html

  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});


const config : HardhatUserConfig = {
  solidity: {
    version :    "0.8.4",
    settings: {
      outputSelection: {
        "*": {
          "*": ["storageLayout"]
        }
      }
    }
  },
  typechain: {
    outDir: './typechain',
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
  },
};

export default config;
