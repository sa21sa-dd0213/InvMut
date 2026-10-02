import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia reference (ethers v6)", function () {
  it("should detect mutant mb2e5d01e by verifying Transfer event emission on transfer", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First need to get tokens - call getTokens() as a whitelisted user (not blacklisted)
    // Since owner is not blacklisted and distribution is not finished, owner can call getTokens
    // But getTokens requires value <= totalRemaining, and value = 2500e18 initially
    const txGetTokens = await instance.connect(owner).getTokens();
    await txGetTokens.wait();

    // Now owner has some tokens, transfer to addr1 and check for Transfer event
    const transferAmount = ethers.parseEther("10");
    
    // Listen for the Transfer event
    await expect(
      instance.connect(owner).transfer(addr1.address, transferAmount)
    )
      .to.emit(instance, "Transfer")
      .withArgs(owner.address, addr1.address, transferAmount);
  });
});