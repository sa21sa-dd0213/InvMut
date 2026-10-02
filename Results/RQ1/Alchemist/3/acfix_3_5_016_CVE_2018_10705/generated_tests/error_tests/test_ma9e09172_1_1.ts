import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-admin calls setOwner (kill mutant that removes onlyAdmin modifier)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 is not the admin (admin is msg.sender at deployment = owner)
    // In original contract, calling setOwner from addr1 should revert because of onlyAdmin modifier
    // In mutant (modifier removed), the call would succeed, so this test kills the mutant
    await expect(
      instance.connect(addr1).setOwner(addr2.address)
    ).to.be.revertedWith("Only admin can call address(this) function");
  });
});