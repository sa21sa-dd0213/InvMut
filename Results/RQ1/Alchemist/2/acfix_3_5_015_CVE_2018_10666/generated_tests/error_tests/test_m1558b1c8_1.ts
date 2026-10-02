import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Owned mutant m1558b1c8 test", function () {
  it("should revert when admin calls setOwner due to mutated modifier", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The admin is the deployer (owner). In the mutant, onlyAdmin modifier requires msg.sender != admin,
    // so calling from the admin should revert.
    await expect(
      instance.connect(owner).setOwner(addr1.address)
    ).to.be.revertedWith("Only admin can call address(this) function");
  });
});