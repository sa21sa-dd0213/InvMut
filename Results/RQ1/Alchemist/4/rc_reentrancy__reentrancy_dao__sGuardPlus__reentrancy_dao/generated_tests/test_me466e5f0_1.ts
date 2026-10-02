import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant test - me466e5f0", function () {
  it("should revert when user with zero credit calls withdrawAll", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // User with zero balance should not be able to withdraw
    await expect(
      instance.connect(user).withdrawAll()
    ).to.be.reverted;
  });
});