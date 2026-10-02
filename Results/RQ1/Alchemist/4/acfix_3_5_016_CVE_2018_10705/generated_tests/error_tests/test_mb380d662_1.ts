import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Owned mutant test - mb380d662", function () {
  it("should kill mutant that sets owner to address(this) instead of _owner", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initial owner should be the deployer (msg.sender)
    expect(await instance.owner()).to.equal(owner.address);

    // Call setOwner with addr1's address
    await instance.connect(owner).setOwner(addr1.address);

    // In the original, owner becomes addr1.address
    // In the mutant, owner becomes the contract's own address (address(this))
    // So this assertion should fail on the mutant, killing it
    expect(await instance.owner()).to.equal(addr1.address);
  });
});