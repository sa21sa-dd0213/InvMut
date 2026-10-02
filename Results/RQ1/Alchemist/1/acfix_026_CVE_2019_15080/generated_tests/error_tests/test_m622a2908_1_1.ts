import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should allow the owner to transfer ownership (mutant kills this by reverting when owner calls)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy contract - Owned has no constructor arguments
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initially, owner should be able to call transferOwnership
    // In the mutant, require(msg.sender != owner) will revert when owner calls
    const tx = instance.connect(owner).transferOwnership(addr1.address);
    await expect(tx).to.not.be.reverted;

    // Verify ownership was transferred successfully
    expect(await instance.owner()).to.equal(addr1.address);
  });
});