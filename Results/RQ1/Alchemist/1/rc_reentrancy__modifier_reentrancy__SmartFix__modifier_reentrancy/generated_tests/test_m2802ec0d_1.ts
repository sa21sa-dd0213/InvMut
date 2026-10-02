import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant detection test", function () {
  it("should kill mutant m2802ec0d by calling airDrop with zero balance and expecting success on original but revert on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Bank contract (needed for supportsToken modifier)
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();
    
    // Deploy ModifierEntrancy - no constructor arguments needed
    const Factory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Call airDrop from addr1 who has zero balance
    // On original: require((0 + 20) >= 0) passes
    // On mutant: require((0 - 20) >= 0) fails with revert
    await expect(
      instance.connect(addr1).airDrop()
    ).to.not.be.reverted;
    
    // Verify the balance was increased by 20
    const balance = await instance.tokenBalance(addr1.address);
    expect(balance).to.equal(20);
  });
});