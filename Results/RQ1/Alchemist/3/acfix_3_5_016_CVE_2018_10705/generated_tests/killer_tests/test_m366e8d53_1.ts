import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m366e8d53 by verifying setOwner correctly updates owner address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Verify initial owner is the deployer
    expect(await instance.owner()).to.equal(owner.address);

    // Call setOwner with a different address
    const newOwner = addr1.address;
    await instance.connect(owner).setOwner(newOwner);

    // Assert that owner was updated to the provided address (not address(0))
    const currentOwner = await instance.owner();
    expect(currentOwner).to.equal(newOwner);
  });
});