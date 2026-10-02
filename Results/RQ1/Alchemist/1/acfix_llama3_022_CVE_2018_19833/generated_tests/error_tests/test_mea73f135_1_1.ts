import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant mea73f135 test", function () {
  it("should revert when non-owner calls owned()", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(1000, "TestToken", "TTK");
    await instance.waitForDeployment();

    // Attempt to call owned() from a non-owner address - should revert on original, but not on mutant
    await expect(
      instance.connect(addr1).owned()
    ).to.be.revertedWith("Only the current owner can change ownership");
  });
});