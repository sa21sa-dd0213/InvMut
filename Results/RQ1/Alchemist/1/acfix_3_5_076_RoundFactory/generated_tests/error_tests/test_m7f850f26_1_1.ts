import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant m7f850f26 - initializer modifier removal", function () {
  it("should revert when calling initialize a second time", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy RoundFactory (no constructor arguments needed as per the contract)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call to initialize should succeed
    const tx1 = await instance.initialize();
    await tx1.wait();

    // Second call to initialize should revert because contract is already initialized
    await expect(instance.initialize()).to.be.reverted;
  });
});