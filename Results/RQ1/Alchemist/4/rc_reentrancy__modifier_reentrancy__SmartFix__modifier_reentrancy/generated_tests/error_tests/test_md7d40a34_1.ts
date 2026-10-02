import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant test - md7d40a34", function () {
  it("should detect mutant by calling airDrop twice and expecting second call to succeed on original but revert on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a Bank contract for the supportsToken check
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();
    
    // First call to airDrop - should succeed and give addr1 20 tokens
    await instance.connect(addr1).airDrop();
    
    // Verify balance is now 20
    const balanceAfterFirst = await instance.tokenBalance(addr1.address);
    expect(balanceAfterFirst).to.equal(20);
    
    // Second call to airDrop with same address
    // On the original contract: require(20 + 20 >= 20) passes -> succeeds
    // On the mutant: require(20 + 20 == 20) fails -> reverts
    await expect(
      instance.connect(addr1).airDrop()
    ).to.be.reverted;
  });
});