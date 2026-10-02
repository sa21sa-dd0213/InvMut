import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrancy_bonus mutant mc5a86e3b test", function () {
  it("should detect removal of claimedBonus guard by expecting revert on second call", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrancy_bonus");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call should succeed
    const tx1 = await instance.connect(addr1).getFirstWithdrawalBonus(addr1.address);
    await tx1.wait();

    // Second call should revert in original, but succeed in mutant
    // We expect revert to detect the mutant
    await expect(
      instance.connect(addr1).getFirstWithdrawalBonus(addr1.address)
    ).to.be.reverted;
  });
});