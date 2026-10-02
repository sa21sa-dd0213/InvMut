import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when sending zero amount (kill mutant that removes amount > 0 check)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The original contract requires amount > 0, so calling with amount = 0 should revert
    // The mutant removes this check, so it would not revert - killing the mutant
    await expect(
      instance.connect(owner).sendTo(addr1.address, 0)
    ).to.be.reverted;
  });
});