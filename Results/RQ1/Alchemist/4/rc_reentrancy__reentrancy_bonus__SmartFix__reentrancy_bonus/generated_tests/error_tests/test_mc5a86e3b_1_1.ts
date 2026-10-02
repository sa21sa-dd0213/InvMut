import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrancy_bonus mutant test - mc5a86e3b", function () {
  it("should revert when calling getFirstWithdrawalBonus twice for the same recipient, but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrancy_bonus");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call should succeed (original and mutant)
    await instance.getFirstWithdrawalBonus(addr1.address);
    
    // Second call should revert in original contract due to claimedBonus check
    // In mutant (without the require check), this call will succeed, failing the test
    await expect(
      instance.getFirstWithdrawalBonus(addr1.address)
    ).to.be.reverted;
  });
});