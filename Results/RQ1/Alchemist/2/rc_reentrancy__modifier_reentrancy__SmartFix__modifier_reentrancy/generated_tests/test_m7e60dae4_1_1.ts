import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant detection - hasNoBalance modifier", function () {
  it("should kill mutant m7e60dae4 by calling airDrop from an address with zero balance and expecting success", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Bank contract (needed for supportsToken modifier check)
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();
    
    // Deploy ModifierEntrancy (no constructor arguments)
    const Factory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Verify addr1 has zero token balance initially
    expect(await instance.tokenBalance(addr1.address)).to.equal(0);
    
    // Call airDrop from addr1 - this should succeed in original but revert in mutant
    await expect(
      instance.connect(addr1).airDrop()
    ).to.not.be.reverted;
    
    // Verify the balance increased to 20
    expect(await instance.tokenBalance(addr1.address)).to.equal(20);
  });
});