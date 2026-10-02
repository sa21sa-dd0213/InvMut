import { expect } from "chai";
import { ethers } } from "hardhat";

describe("ModifierEntrancy mutant test - hasNoBalance modifier", function () {
  it("should allow address with zero balance to call airDrop (kills mutant that uses !=)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy ModifierEntrancy (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy Bank contract (needed by supportsToken modifier)
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();
    
    // addr1 has zero tokenBalance initially (by default)
    // Call airDrop from addr1 - should succeed in original, fail in mutant
    await expect(
      instance.connect(addr1).airDrop()
    ).to.not.be.reverted;
    
    // Verify the balance increased
    expect(await instance.tokenBalance(addr1.address)).to.equal(20);
  });
});