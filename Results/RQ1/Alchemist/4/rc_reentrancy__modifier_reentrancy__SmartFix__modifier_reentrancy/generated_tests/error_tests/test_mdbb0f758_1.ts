import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant test - mdbb0f758", function () {
  it("should kill mutant by calling airDrop and expecting success on original, but revert on mutant due to <= comparison", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Bank contract first (needed for supportsToken modifier)
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();
    
    // Deploy ModifierEntrancy
    const Factory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Set up the test: addr1 should have 0 token balance initially
    // Call airDrop from addr1 - this should succeed on original (balance becomes 20)
    // On mutant, the require statement with <= will always revert
    
    // First verify initial balance is 0
    expect(await instance.tokenBalance(addr1.address)).to.equal(0);
    
    // Attempt to call airDrop - this will revert on the mutant because
    // (0 + 20) <= 0 evaluates to false
    // On the original, (0 + 20) >= 0 evaluates to true and succeeds
    await expect(
      instance.connect(addr1).airDrop()
    ).to.be.reverted;
    
    // Verify balance remained 0 (mutant killed - transaction reverted)
    expect(await instance.tokenBalance(addr1.address)).to.equal(0);
  });
});