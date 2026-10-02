import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant detection - mbfe72718", function () {
  it("should detect mutant that sets owner to address(this) instead of _owner parameter", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify initial owner is the deployer
    expect(await instance.owner()).to.equal(owner.address);

    // Call setOwner with a different address (addr1)
    await instance.connect(owner).setOwner(addr1.address);

    // In the original contract, owner should now be addr1
    // In the mutant, owner would be the contract address (address(this))
    const currentOwner = await instance.owner();
    
    // This assertion will fail on the mutant because owner will be contract address, not addr1
    expect(currentOwner).to.equal(addr1.address);
    
    // Additional verification: owner should NOT be the contract address
    expect(currentOwner).to.not.equal(await instance.getAddress());
  });
});