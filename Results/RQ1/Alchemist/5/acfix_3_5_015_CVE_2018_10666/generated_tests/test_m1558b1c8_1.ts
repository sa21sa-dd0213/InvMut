import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Owned reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m1558b1c8 by verifying admin can call setOwner without revert", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant changes == to != in onlyAdmin modifier, so admin (owner) should be reverted
    // but original allows admin to call. We expect success from admin on original,
    // so the mutant will revert and the test will fail (killing the mutant)
    await expect(
      instance.connect(owner).setOwner(addr1.address)
    ).to.not.be.reverted;
  });
});