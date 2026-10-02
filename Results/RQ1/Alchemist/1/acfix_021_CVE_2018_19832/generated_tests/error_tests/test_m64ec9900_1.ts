import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia - mutant m64ec9900 test", function () {
  it("should kill mutant by transferring to a non-zero address and expecting success", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, set up distribution to give addr1 some tokens
    // Call getTokens() from addr1 to receive initial distribution
    // Note: distribution must not be finished, and addr1 must not be blacklisted
    await instance.connect(addr1).getTokens({ value: 0 });

    // Now get the balance of addr1 before transfer
    const balanceBefore = await instance.balanceOf(addr1.address);
    expect(balanceBefore).to.be.gt(0);

    // Attempt transfer from addr1 to a non-zero address (owner)
    // In the original contract this should succeed
    // In the mutant (require(_to == address(0))) this will revert
    await expect(
      instance.connect(addr1).transfer(owner.address, balanceBefore)
    ).to.not.be.reverted;

    // Verify the transfer actually happened (balance changed)
    const balanceAfter = await instance.balanceOf(addr1.address);
    expect(balanceAfter).to.equal(0);
  });
});