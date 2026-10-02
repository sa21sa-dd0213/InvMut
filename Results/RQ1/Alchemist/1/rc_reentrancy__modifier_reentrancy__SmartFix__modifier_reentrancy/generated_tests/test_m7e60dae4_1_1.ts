import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant m7e60dae4 test", function () {
  it("should revert when calling airDrop with zero balance (mutant has != instead of ==)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Bank contract first (needed by supportsToken modifier)
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();
    
    // Deploy ModifierEntrancy (no constructor arguments needed)
    const ModifierEntrancyFactory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await ModifierEntrancyFactory.deploy();
    await instance.waitForDeployment();
    
    // Simulate calling from the bank address to satisfy supportsToken modifier
    // The airDrop function will revert in the mutant because addr1 has 0 balance
    // and the mutant requires tokenBalance[msg.sender] != 0
    await expect(
      instance.connect(bank.getAddress() as any).airDrop()
    ).to.be.reverted;
  });
});