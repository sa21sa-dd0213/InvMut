import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant test", function () {
  it("should detect the mutant that changes >= to == in the require statement", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Bank contract (needed for supportsToken modifier)
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();
    
    // Deploy ModifierEntrancy (no constructor arguments needed)
    const ModifierEntrancyFactory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await ModifierEntrancyFactory.deploy();
    await instance.waitForDeployment();
    
    // First call to airDrop() should succeed on both original and mutant
    // (balance is 0, so 0+20 == 0 is false, but 0+20 >= 0 is true)
    await instance.connect(addr1).airDrop();
    
    // Check that addr1 now has a non-zero balance
    expect(await instance.tokenBalance(addr1.address)).to.equal(20);
    
    // Second call to airDrop() should succeed on original (20+20 >= 20 is true)
    // but should revert on mutant (20+20 == 20 is false)
    await expect(
      instance.connect(addr1).airDrop()
    ).to.be.reverted;
  });
});