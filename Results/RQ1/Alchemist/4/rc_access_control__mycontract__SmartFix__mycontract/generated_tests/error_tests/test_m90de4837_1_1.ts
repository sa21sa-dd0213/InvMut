import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when amount is 0 (detects removal of require(amount > 0))", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Owner calls sendTo with amount = 0, should revert in original contract
    // but would succeed in mutant where the require(amount > 0) is removed
    await expect(
      instance.connect(owner).sendTo(addr1.address, 0)
    ).to.be.reverted;
  });
});