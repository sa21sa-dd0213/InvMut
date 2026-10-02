import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m36b0aaa1 detection", function () {
  it("should revert Collect when unlock time not reached (original && vs mutant ||)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // addr1 deposits 2 ether with unlock time far in the future
    const futureTime = Math.floor(Date.now() / 1000) + 100000;
    await instance.connect(addr1).Put(futureTime, { value: ethers.parseEther("2") });

    // Try to collect 1 ether before unlock time - should revert in original
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("1"))
    ).to.be.reverted;
  });
});