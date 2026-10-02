import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant m8f0dd4b9 detection", function () {
  it("should detect mutant where >= replaces > by checking zero-credit withdrawal reverts", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // User has zero credit - should not be able to withdraw
    const tx = instance.connect(user).withdrawAll();

    // Original contract would pass through the if block without reverting
    // but the mutant makes an external call with 0 value which should fail
    // because the contract has no ETH to send (balance is 0)
    await expect(tx).to.be.reverted;
  });
});