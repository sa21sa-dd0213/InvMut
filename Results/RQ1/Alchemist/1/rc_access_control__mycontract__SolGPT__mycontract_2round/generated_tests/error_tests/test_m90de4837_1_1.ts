import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract mutant detection", function () {
  it("should revert when amount is zero (kills mutant m90de4837)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Calling sendTo with amount = 0 should revert on the original,
    // but the mutant removed the require(amount > 0) check, so it would not revert.
    await expect(
      instance.connect(owner).sendTo(addr1.address, 0)
    ).to.be.reverted;
  });
});