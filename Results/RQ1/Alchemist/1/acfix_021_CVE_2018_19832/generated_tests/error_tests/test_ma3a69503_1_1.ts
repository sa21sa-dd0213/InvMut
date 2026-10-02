import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant ma3a69503 - transfer >= replaced by <=", function () {
  it("should revert when transferring amount less than balance (mutant requires amount >= balance)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First distribute tokens to addr1 so they have a balance
    // The getTokens() function can be called by anyone (with onlyWhitelist modifier)
    // We need to ensure distribution is not finished and addr1 is not blacklisted
    // Let's first call getTokens() from owner to set up the distribution
    await instance.connect(owner).getTokens();

    // Now check addr1's balance (should be 0 initially)
    const balanceBefore = await instance.balanceOf(addr1.address);
    expect(balanceBefore).to.equal(0);

    // Transfer some tokens from owner to addr1 so addr1 has a balance
    const transferAmount = ethers.parseEther("100");
    await instance.connect(owner).transfer(addr1.address, transferAmount);

    const addr1Balance = await instance.balanceOf(addr1.address);
    expect(addr1Balance).to.equal(transferAmount);

    // Now addr1 tries to transfer an amount LESS than their balance
    // In the original contract this should succeed (amount <= balance)
    // In the mutant (amount >= balance), this should revert because 50 < 100
    const smallerAmount = ethers.parseEther("50");

    // This should revert in the mutant but pass in the original
    await expect(
      instance.connect(addr1).transfer(owner.address, smallerAmount)
    ).to.be.reverted;
  });
});