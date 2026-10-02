import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant kill test - ma9e09172", function () {
  it("should revert when non-admin tries to setOwner (mutant removed onlyAdmin modifier)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 is not the admin (admin is msg.sender during deploy = owner)
    await expect(
      instance.connect(addr1).setOwner(addr1.address)
    ).to.be.revertedWith("Only admin can call address(this) function");
  });
});