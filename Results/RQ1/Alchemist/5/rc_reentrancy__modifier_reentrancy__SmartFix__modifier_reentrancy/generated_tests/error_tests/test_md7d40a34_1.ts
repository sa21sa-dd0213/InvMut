import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant test - kill md7d40a34", function () {
  it("should allow airDrop from an address with zero token balance (original behavior)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy ModifierEntrancy (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Verify addr1 has zero token balance
    expect(await instance.tokenBalance(addr1.address)).to.equal(0);
    
    // Call airDrop from addr1 - should succeed on original, fail on mutant
    await expect(instance.connect(addr1).airDrop()).to.not.be.reverted;
    
    // Verify the balance increased by 20
    expect(await instance.tokenBalance(addr1.address)).to.equal(20);
  });
});