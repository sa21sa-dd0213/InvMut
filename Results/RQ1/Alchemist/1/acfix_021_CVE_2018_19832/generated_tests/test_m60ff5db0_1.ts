import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m60ff5db0 by transferring amount less than allowance", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Setup: owner transfers some tokens to addr1 for testing
    const transferAmount = ethers.parseEther("1000");
    await instance.connect(owner).transfer(addr1.address, transferAmount);

    // Approve addr2 to spend 500 tokens from addr1's balance
    const approvalAmount = ethers.parseEther("500");
    await instance.connect(addr1).approve(addr2.address, approvalAmount);

    // Try to transfer 300 tokens (less than the 500 approved) from addr1 to owner
    // Original contract: should succeed because 300 <= 500
    // Mutant contract: should revert because 300 != 500
    const transferLessAmount = ethers.parseEther("300");
    await expect(
      instance.connect(addr2).transferFrom(addr1.address, owner.address, transferLessAmount)
    ).to.be.reverted;
  });
});