import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrancy_bonus mutant detection - mc5a86e3b", function () {
  it("should revert on second bonus claim in original but succeed in mutant (double bonus)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrancy_bonus");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call should succeed - claim bonus
    await instance.getFirstWithdrawalBonus(addr1.address);

    // Get balance after first bonus claim
    const balanceAfterFirstClaim = await ethers.provider.getBalance(addr1.address);

    // Second call - this should revert in original (claimedBonus check) but succeed in mutant
    // We expect it to revert, proving the mutant is killed
    await expect(
      instance.getFirstWithdrawalBonus(addr1.address)
    ).to.be.reverted;

    // Verify no second bonus was sent (balance unchanged after failed second call)
    const balanceAfterSecondCall = await ethers.provider.getBalance(addr1.address);
    expect(balanceAfterSecondCall).to.equal(balanceAfterFirstClaim);
  });
});