import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant kill test - m3d184b72", function () {
  it("should detect that transferOwnership sets owner to address(this) instead of newOwner", async function () {
    const [owner, newOwner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify initial owner is the deployer
    const initialOwner = await instance.owner();
    expect(initialOwner).to.equal(owner.address);

    // Call transferOwnership with a different address
    const tx = await instance.connect(owner).transferOwnership(newOwner.address);
    await tx.wait();

    // Get the current owner after transfer
    const currentOwner = await instance.owner();

    // In the original contract, owner should be newOwner
    // In the mutant, owner will be address(this) (the contract address)
    // This assertion will pass on original but fail on mutant
    expect(currentOwner).to.equal(newOwner.address);
  });
});