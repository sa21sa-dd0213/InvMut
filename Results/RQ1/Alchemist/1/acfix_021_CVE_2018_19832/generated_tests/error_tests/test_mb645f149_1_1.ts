import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant test for transfer balance check", function () {
  it("should revert when transferring amount exceeding sender's balance (kills mutant mb645f149)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    // Constructor takes no arguments based on contract code
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, fund addr1 with some tokens by calling getTokens (which distributes)
    // Need to ensure distribution is not finished and addr1 is not blacklisted
    // Send enough ether to trigger distribution
    await instance.connect(addr1).getTokens({ value: ethers.parseEther("1") });

    // Get addr1's balance after distribution
    const balance = await instance.balanceOf(addr1.address);

    // Attempt to transfer more than balance - should revert in original, pass in mutant
    await expect(
      instance.connect(addr1).transfer(owner.address, balance + 1n)
    ).to.be.reverted;
  });
});