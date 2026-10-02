import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant test - transferOwnership", function () {
  it("should detect mutant that sets owner to address(this) instead of newOwner", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify initial owner is the deployer
    expect(await instance.owner()).to.equal(owner.address);

    // Transfer ownership to addr1
    await instance.connect(owner).transferOwnership(addr1.address);

    // In the original contract, owner should now be addr1
    // In the mutant, owner would be the contract address itself
    const newOwner = await instance.owner();

    // This assertion will pass on the original (owner = addr1) 
    // but fail on the mutant (owner = contract address)
    expect(newOwner).to.equal(addr1.address);

    // Additional verification: try to call onlyOwner function from new owner
    // This should succeed on original but revert on mutant
    await expect(
      instance.connect(addr1).finishDistribution()
    ).to.not.be.reverted;
  });
});