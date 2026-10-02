import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant m78d256b5 test", function () {
  it("should kill the mutant by verifying ownership is transferred to the new owner, not the contract itself", async function () {
    const [owner, newOwner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Transfer ownership to newOwner
    await instance.connect(owner).transferOwnership(newOwner.address);

    // Verify that the owner is the newOwner, not the contract address
    const currentOwner = await instance.owner();
    expect(currentOwner).to.equal(newOwner.address);
    expect(currentOwner).to.not.equal(await instance.getAddress());
  });
});