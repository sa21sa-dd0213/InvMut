import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant detection - m2802ec0d", function () {
  it("should detect the mutant by calling airDrop and expecting success (original behavior) but observing revert", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Bank contract first (needed for supportsToken check)
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();
    
    // Deploy ModifierEntrancy - no constructor arguments needed
    const Factory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Call airDrop from addr1 (which has zero balance, satisfying hasNoBalance)
    // In the original, this succeeds. In the mutant, it reverts due to underflow.
    await expect(
      instance.connect(addr1).airDrop()
    ).to.not.be.reverted;
    
    // Verify the balance increased by 20
    const balance = await instance.tokenBalance(addr1.address);
    expect(balance).to.equal(20);
  });
});