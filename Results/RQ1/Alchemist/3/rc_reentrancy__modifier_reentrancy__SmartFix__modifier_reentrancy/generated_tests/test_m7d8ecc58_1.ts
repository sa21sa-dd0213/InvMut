import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant m7d8ecc58", function () {
  it("should revert on second call due to reentrancy lock (original behavior)", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the Bank contract (required by supportsToken modifier)
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();
    
    // Deploy ModifierEntrancy (no constructor arguments needed)
    const ModifierEntrancyFactory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await ModifierEntrancyFactory.deploy();
    await instance.waitForDeployment();
    
    // Attacker calls airDrop once - should succeed
    const tx1 = await instance.connect(attacker).airDrop();
    await tx1.wait();
    
    // Verify balance increased
    expect(await instance.tokenBalance(attacker.address)).to.equal(20);
    
    // Attempt second call - should revert due to _nonReentrant modifier
    // (In the mutant, this would succeed, killing it)
    await expect(
      instance.connect(attacker).airDrop()
    ).to.be.reverted;
  });
});