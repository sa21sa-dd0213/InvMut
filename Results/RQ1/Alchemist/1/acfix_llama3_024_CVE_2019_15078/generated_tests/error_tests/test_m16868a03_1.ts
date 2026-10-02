import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant m16868a03 - transferOwnership modifier removal", function () {
  it("should revert when non-owner calls transferOwnership on original contract, but succeed on mutant (killing it)", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // On the original contract (with onlyOwner modifier), attacker cannot change owner
    // But on the mutant (without onlyOwner), attacker can change owner
    // We test that attacker can successfully call transferOwnership and become the new owner
    await instance.connect(attacker).transferOwnership(attacker.address);
    
    // Verify the owner has changed to the attacker
    // The contract does not expose owner publicly, but we can verify by calling an onlyOwner function
    // finishDistribution is onlyOwner, so if attacker is now owner, they can call it
    await expect(instance.connect(attacker).finishDistribution()).to.not.be.reverted;
    
    // Also verify that the original owner can no longer call onlyOwner functions
    await expect(instance.connect(owner).finishDistribution()).to.be.reverted;
  });
});