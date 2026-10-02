import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant detection", function () {
  it("should kill mutant md69ea067 by verifying owner is set to constructor argument, not contract address", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy with a specific owner address
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();
    
    // Verify that owner is NOT the contract itself (mutant sets owner = address(this))
    const contractAddress = await instance.getAddress();
    const storedOwner = await instance.owner();
    expect(storedOwner).to.not.equal(contractAddress);
    
    // The owner should be the address passed to constructor
    expect(storedOwner).to.equal(owner.address);
    
    // Attempt withdrawAll from the intended owner - should succeed in original, fail in mutant
    // because mutant sets owner to contract address, not the constructor argument
    await expect(
      instance.connect(owner).withdrawAll(attacker.address)
    ).to.not.be.reverted;
    
    // Verify the attacker can't call withdrawAll (only owner can)
    await expect(
      instance.connect(attacker).withdrawAll(attacker.address)
    ).to.be.reverted;
  });
});