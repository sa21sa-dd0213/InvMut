import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should return true when setOwner is called by admin (detects missing return true)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call setOwner from the admin (which is msg.sender during deployment = owner)
    const tx = await instance.connect(owner).setOwner(addr1.address);
    await tx.wait();

    // Verify the owner was updated
    expect(await instance.owner()).to.equal(addr1.address);

    // Verify the function returned true (original behavior)
    // Re-call to capture return value
    const result = await instance.connect(owner).setOwner.staticCall(addr1.address);
    expect(result).to.equal(true);
  });
});