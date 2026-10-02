import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant detection - transfer balance check", function () {
  it("should kill mutant by transferring partial balance (less than full balance)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy contract - XBORNID has no constructor arguments
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial balance of owner (totalDistributed = 200000000e18)
    const ownerBalance = await instance.balanceOf(owner.address);

    // Calculate a partial amount (1% of owner's balance)
    const partialAmount = ownerBalance / BigInt(100);

    // Verify partial amount is strictly less than full balance
    expect(partialAmount).to.be.lessThan(ownerBalance);

    // Transfer partial amount from owner to addr1
    // Original contract: should succeed with <= check
    // Mutant: should revert with == check (requires sending entire balance)
    await expect(
      instance.transfer(addr1.address, partialAmount)
    ).to.not.be.reverted;

    // Verify transfer actually occurred (confirms partial transfer worked)
    const addr1Balance = await instance.balanceOf(addr1.address);
    expect(addr1Balance).to.equal(partialAmount);

    // Verify owner's balance decreased by partial amount
    const newOwnerBalance = await instance.balanceOf(owner.address);
    expect(newOwnerBalance).to.equal(ownerBalance - partialAmount);
  });
});