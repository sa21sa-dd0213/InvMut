import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract mutant detection - m7b7a7920", function () {
  it("should revert when amount is zero (mutant replaces > with >=)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to send zero amount - should revert in original but pass in mutant
    await expect(
      instance.connect(owner).sendTo(addr1.address, 0)
    ).to.be.reverted;
  });
});