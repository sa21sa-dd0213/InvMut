import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner calls transferOwnership (kills mutant that removes require from onlyOwner)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 is not the owner, so calling transferOwnership should revert
    await expect(
      instance.connect(addr1).transferOwnership(addr2.address)
    ).to.be.reverted;
  });
});