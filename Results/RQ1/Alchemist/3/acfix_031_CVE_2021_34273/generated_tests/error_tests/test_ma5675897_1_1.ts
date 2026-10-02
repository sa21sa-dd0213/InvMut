import { expect } from "chai";
import { ethers } from "hardhat";

describe("Owned mutant ma5675897 - access control on owned()", function () {
  it("should revert when non-owner calls owned() due to onlyOwner modifier", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Owned");
    // Constructor takes no arguments (Owned has no constructor parameters)
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The original contract reverts when non-owner calls owned()
    // The mutant removes the onlyOwner modifier, so the call would succeed
    // Therefore, this test should pass on the original but fail on the mutant
    await expect(
      instance.connect(addr1).owned()
    ).to.be.reverted;
  });
});