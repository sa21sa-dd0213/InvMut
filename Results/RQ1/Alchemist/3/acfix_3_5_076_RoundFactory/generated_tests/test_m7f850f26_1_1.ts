import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant kill test - m7f850f26", function () {
  it("should revert when calling initialize() a second time due to initializer modifier", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call to initialize() should succeed
    await instance.initialize();

    // Second call to initialize() should revert because the initializer modifier prevents re-initialization
    await expect(instance.initialize()).to.be.revertedWith(
      "Initializable: contract is already initialized"
    );
  });
});