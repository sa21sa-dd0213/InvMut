import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant test - m7e60dae4", function () {
  it("should revert when calling airDrop from an address with zero balance (mutant incorrectly requires non-zero balance)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Bank contract (needed for supportsToken check)
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();
    
    // Deploy ModifierEntrancy (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // addr1 has zero balance initially - original should succeed, mutant should revert
    await expect(
      instance.connect(addr1).airDrop()
    ).to.not.be.reverted;
    
    // Verify balance increased by 20
    expect(await instance.tokenBalance(addr1.address)).to.equal(20);
  });
  
  it("should succeed when calling airDrop from an address with non-zero balance (mutant incorrectly allows this)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Bank contract
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();
    
    // Deploy ModifierEntrancy
    const Factory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // First give addr1 some tokens via owner
    // Since airDrop requires zero balance, we need to bypass modifiers for setup
    // Use direct state manipulation for testing purposes
    await instance.connect(owner).tokenBalance(addr1.address); // read only, not helpful
    
    // Actually we can call airDrop once to give addr1 20 tokens
    await instance.connect(addr1).airDrop();
    
    // Now addr1 has non-zero balance (20)
    // In original: second call should revert (hasNoBalance requires zero)
    // In mutant: second call should succeed (hasNoBalance requires non-zero)
    await expect(
      instance.connect(addr1).airDrop()
    ).to.be.reverted; // This will fail on mutant, killing it
  });
});