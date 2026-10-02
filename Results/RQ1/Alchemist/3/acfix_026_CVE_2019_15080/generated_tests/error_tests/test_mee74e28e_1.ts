import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner tries to transfer ownership (kills mutant that removes require check)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 is not the owner, so transferOwnership should revert
    await expect(
      instance.connect(addr1).transferOwnership(addr1.address)
    ).to.be.reverted;
  });
});