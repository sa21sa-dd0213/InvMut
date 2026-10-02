import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m36bf21bf by verifying transferOwnership assigns the correct address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify initial owner is the deployer
    expect(await instance.owner()).to.equal(owner.address);

    // Transfer ownership to addr1
    const tx = await instance.connect(owner).transferOwnership(addr1.address);
    await tx.wait();

    // Assert that owner is addr1, not the contract address (which would be the mutant behavior)
    const currentOwner = await instance.owner();
    expect(currentOwner).to.equal(addr1.address);
    expect(currentOwner).to.not.equal(await instance.getAddress());
  });
});