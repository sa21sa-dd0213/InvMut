import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-admin calls setOwner (mutant removes onlyAdmin modifier)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 is NOT the admin (admin is the deployer, which is owner)
    // Original contract reverts for non-admin, mutant does not
    await expect(
      instance.connect(addr1).setOwner(addr1.address)
    ).to.be.revertedWith("Only admin can call address(this) function");
  });
});