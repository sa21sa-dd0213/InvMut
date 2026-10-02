import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Owned mutant test - m1558b1c8", function () {
  it("should revert when admin calls setOwner due to mutated onlyAdmin modifier", async function () {
    const [admin, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant changes == to != in onlyAdmin, so admin (msg.sender == admin) will now fail the require
    await expect(
      instance.connect(admin).setOwner(addr1.address)
    ).to.be.revertedWith("Only admin can call address(this) function");
  });
});