import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant detection - mbe979835", function () {
  it("should detect removal of hasNoBalance modifier by calling airDrop twice from same address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Bank contract first (needed for supportsToken check)
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();
    
    // Deploy ModifierEntrancy - no constructor arguments needed
    const Factory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // First call from addr1 should succeed
    await expect(instance.connect(addr1).airDrop()).to.not.be.reverted;
    
    // Check balance after first call
    expect(await instance.tokenBalance(addr1.address)).to.equal(20);
    
    // Second call from same address should revert in original (hasNoBalance modifier)
    // but succeed in mutant (modifier removed)
    // We expect revert for the original, so if it succeeds it kills the mutant
    await expect(instance.connect(addr1).airDrop()).to.be.reverted;
    
    // If we reach here without revert, the mutant is killed (test fails)
    // Additional check: balance should still be 20 if modifier was present
    expect(await instance.tokenBalance(addr1.address)).to.equal(20);
  });
});