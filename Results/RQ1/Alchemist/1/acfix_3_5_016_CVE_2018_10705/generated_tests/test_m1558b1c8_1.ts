import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when admin calls setOwner after the mutant changes == to !=", async function () {
    const [admin, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Admin should succeed on original but fail on mutant (admin is blocked by !=)
    await expect(
      instance.connect(admin).setOwner(addr1.address)
    ).to.be.revertedWith("Only admin can call address(this) function");
  });
});