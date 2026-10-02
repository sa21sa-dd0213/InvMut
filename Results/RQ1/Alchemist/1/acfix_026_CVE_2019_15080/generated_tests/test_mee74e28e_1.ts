import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner calls transferOwnership (kills mutant that removes require in onlyOwner)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to call transferOwnership from a non-owner address
    // The original contract should revert; the mutant (missing require) would not
    await expect(
      instance.connect(addr1).transferOwnership(addr1.address)
    ).to.be.reverted;
  });
});