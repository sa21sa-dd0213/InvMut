import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken - Mutant m846be32b test", function () {
  it("should revert when non-owner calls changeUniswapV2Pair", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy with required constructor arguments (router address and USD token address)
    // Using placeholder addresses since actual addresses would depend on the network
    const ROUTER_ADDRESS = "0x0000000000000000000000000000000000000001";
    const USD_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000002";

    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(ROUTER_ADDRESS, USD_TOKEN_ADDRESS);
    await instance.waitForDeployment();

    // Try to call changeUniswapV2Pair from a non-owner address
    // The original contract has onlyOwner modifier which should revert
    await expect(
      instance.connect(addr1).changeUniswapV2Pair("0x0000000000000000000000000000000000000003")
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});