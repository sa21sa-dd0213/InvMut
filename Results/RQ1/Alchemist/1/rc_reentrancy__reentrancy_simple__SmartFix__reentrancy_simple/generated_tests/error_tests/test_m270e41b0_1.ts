import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant m270e41b0 test", function () {
  it("should revert when calling addToBalance with 0 ether on mutant (msg.value-1 underflow)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to call addToBalance with 0 wei - should revert on mutant due to msg.value-1 underflow
    await expect(
      instance.connect(owner).addToBalance({ value: 0 })
    ).to.be.reverted;
  });
});