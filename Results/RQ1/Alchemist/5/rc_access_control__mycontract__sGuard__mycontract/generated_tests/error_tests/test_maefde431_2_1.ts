import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should allow non-owner to send zero amount due to missing require check (mutant)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The original contract would revert because addr1 is not the owner.
    // The mutant removes the require, so the call should succeed (no revert).
    await expect(
      instance.connect(addr1).sendTo(addr2.address, 0)
    ).to.not.be.reverted;
  });
});