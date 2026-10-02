import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant m9316c5ec test", function () {
  it("should revert when addToBalance is called with zero value (kills mutant where require condition is always true)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to call addToBalance with msg.value = 0
    // The original contract requires the balance increase to be valid,
    // but the mutant's condition (userBalance[msg.sender] + 0 + 1 >= userBalance[msg.sender]) is always true,
    // so the mutant would not revert. We expect a revert on the original behavior.
    await expect(
      instance.connect(owner).addToBalance({ value: 0 })
    ).to.be.reverted;
  });
});