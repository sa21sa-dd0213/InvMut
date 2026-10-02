import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant kill test", function () {
  it("should revert on second airDrop call from same address when hasNoBalance modifier is present", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Bank contract (needed for supportsToken modifier)
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();
    
    // Deploy ModifierEntrancy (no constructor arguments needed)
    const ModifierEntrancyFactory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await ModifierEntrancyFactory.deploy();
    await instance.waitForDeployment();
    
    // First call to airDrop should succeed (balance is 0)
    await expect(instance.connect(addr1).airDrop()).to.not.be.reverted;
    
    // Verify balance is now 20
    expect(await instance.tokenBalance(addr1.address)).to.equal(20);
    
    // Second call from same address should revert in original (hasNoBalance check)
    // but would succeed in mutant (missing hasNoBalance modifier)
    // This test kills the mutant by detecting the missing modifier
    await expect(instance.connect(addr1).airDrop()).to.be.reverted;
  });
});