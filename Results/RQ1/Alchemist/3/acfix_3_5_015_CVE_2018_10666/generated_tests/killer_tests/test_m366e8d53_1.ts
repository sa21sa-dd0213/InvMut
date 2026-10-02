import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m366e8d53 by verifying owner is set to the provided address, not address(0)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initially owner should be the deployer
    let currentOwner = await instance.owner();
    expect(currentOwner).to.equal(owner.address);

    // Call setOwner with addr1's address as the new owner
    const tx = await instance.connect(owner).setOwner(addr1.address);
    await tx.wait();

    // Check that owner was actually set to addr1 (not address(0))
    currentOwner = await instance.owner();
    expect(currentOwner).to.equal(addr1.address);
  });
});