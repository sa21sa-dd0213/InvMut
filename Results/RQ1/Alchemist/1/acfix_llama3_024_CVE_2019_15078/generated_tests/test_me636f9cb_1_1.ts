import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant test - transferOwnership condition reversed", function () {
  it("should fail if ownership is not transferred to non-zero address (mutant bug)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initial owner should be the deployer
    expect(await instance.owner()).to.equal(owner.address);

    // Attempt to transfer ownership to addr1 (non-zero address)
    await instance.connect(owner).transferOwnership(addr1.address);

    // In the original contract, ownership would be transferred to addr1
    // In the mutant, the condition is reversed (newOwner == address(0)), so transfer is skipped
    // Therefore, the owner should NOT be addr1 if the mutant is present
    const currentOwner = await instance.owner();
    expect(currentOwner).to.equal(addr1.address);
  });
});