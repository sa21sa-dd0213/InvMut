import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant m034bf1a8 test", function () {
  it("should detect mutant by sending 0 ether via fallback (should succeed on original, fail on mutant)", async function () {
    const [owner] = await ethers.getSigners();
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // Attempt to call fallback with 0 ether - original allows this, mutant reverts
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: 0
      })
    ).to.not.be.reverted;
  });
});