import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m63040b12 test", function () {
  it("should revert when _tos array is empty in transfer function", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The from address is hardcoded as the owner
    // Test with empty _tos array - should revert in original but not in mutant
    await expect(
      instance.connect(owner).transfer([], [])
    ).to.be.reverted;
  });
});