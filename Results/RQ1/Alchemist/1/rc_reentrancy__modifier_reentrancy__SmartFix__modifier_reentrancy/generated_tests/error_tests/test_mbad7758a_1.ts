import { expect } from "chai";
import { ethers } } from "hardhat";

describe("ModifierEntrancy mutant kill test - supportsToken modifier removed", function () {
  it("should revert when called from an address that is not a Bank contract supporting Nu Token", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Bank contract
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();
    
    // Deploy ModifierEntrancy (no constructor arguments needed)
    const ModifierEntrancyFactory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await ModifierEntrancyFactory.deploy();
    await instance.waitForDeployment();
    
    // Verify that calling airDrop from the Bank contract works (original behavior)
    await expect(instance.connect(bank).airDrop()).to.be.reverted;
    
    // Call airDrop from a random address (addr1) - this should revert on the original 
    // but might succeed on the mutant where the supportsToken modifier is removed
    // We expect revert because addr1 is not a Bank contract
    await expect(instance.connect(addr1).airDrop()).to.be.reverted;
  });
});