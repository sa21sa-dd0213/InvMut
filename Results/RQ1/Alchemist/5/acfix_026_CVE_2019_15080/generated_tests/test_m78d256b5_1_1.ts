import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect mutant that sets owner to contract address instead of new owner", async function () {
    const [owner, newOwner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Transfer ownership to a new address
    const tx = await instance.connect(owner).transferOwnership(newOwner.address);
    await tx.wait();

    // Assert that owner is the new owner, not the contract itself
    const currentOwner = await instance.owner();
    expect(currentOwner).to.equal(newOwner.address);
    // This will fail on mutant because mutant sets owner = address(this) instead
  });
});