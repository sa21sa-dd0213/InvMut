import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant test - mdbb0f758", function () {
  it("should kill the mutant by showing that the require statement with <= reverts for a normal balance of 0", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Bank first (required by supportsToken modifier)
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();
    
    // Deploy ModifierEntrancy (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // The mutant changes >= to <=, so for balance = 0: (0 + 20) <= 0 → false → revert
    // On the original contract, this call would succeed
    await expect(
      instance.connect(addr1).airDrop()
    ).to.be.reverted;
  });
});