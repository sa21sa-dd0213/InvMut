import { expect } from "chai";
import { ethers } from "hardhat";

describe("DepositLog mutant m39d3581e test", function () {
  it("should revert when non-owner calls setApprovedLogger", async function () {
    const [owner, nonOwner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DepositLog");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to call setApprovedLogger from a non-owner address
    // Original contract would revert with "Not owner" due to onlyOwner modifier
    // Mutant would allow the call to succeed
    await expect(
      instance.connect(nonOwner).setApprovedLogger(nonOwner.address, true)
    ).to.be.revertedWith("Not owner");
  });
});