import { expect } from "chai";
import { ethers } from "hardhat";

describe("PRIVATE_ETH_CELL mutant test for m75ba32d2", function () {
  it("should revert when Collect is called with balance less than MinSum", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PRIVATE_ETH_CELL");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.setMinSum(ethers.parseEther("10"));
    await instance.setLogFile(ethers.ZeroAddress); // dummy address, required for initialization
    await instance.initialized();

    // Give addr1 some balance but less than MinSum
    await instance.connect(addr1).deposit({ value: ethers.parseEther("5") });
    
    // Try to collect an amount less than MinSum
    await expect(
      instance.connect(addr1).collect(ethers.parseEther("1"))
    ).to.be.reverted;
  });
});