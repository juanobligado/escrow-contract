// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { run, ethers } from "hardhat";
const hre = require("hardhat");

async function main() {
  await run('compile');
  const tokenAddress ='';
  const Escrow = await ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy(tokenAddress);
  await escrow.deployed();

  console.log("Escrow deployed to:", escrow.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
