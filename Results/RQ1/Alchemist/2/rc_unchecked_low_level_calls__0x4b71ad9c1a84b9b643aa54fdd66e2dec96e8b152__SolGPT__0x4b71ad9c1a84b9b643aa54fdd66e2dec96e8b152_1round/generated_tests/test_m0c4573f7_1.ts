import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant detection - m0c4573f7", function () {
  it("should revert when calling transfer with an empty _tos array", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The original contract requires _tos.length > 0, so empty array should revert
    // The mutant removes this require statement, so it will not revert
    await expect(
      instance.transfer(
        owner.address,
        owner.address,
        [],
        0
      )
    ).to.be.reverted;
  });
});