import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract - kill mutant m2c935e1a", function () {
  it("should allow owner to call sendTo (mutant reverses access control)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const amount = ethers.parseEther("1");
    // Owner calls sendTo - should succeed on original, revert on mutant
    await expect(
      instance.connect(owner).sendTo(addr1.address, amount)
    ).to.not.be.reverted;
  });
});