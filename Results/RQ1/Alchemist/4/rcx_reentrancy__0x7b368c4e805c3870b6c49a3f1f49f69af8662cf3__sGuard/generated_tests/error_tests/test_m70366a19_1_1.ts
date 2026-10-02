import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant m70366a19 test", function () {
  it("should revert when balance equals withdrawal amount (mutant uses > instead of >=)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // Deposit exactly 1 ether (MinSum = 1 ether)
    const depositAmount = ethers.parseEther("1");
    await instance.connect(addr1).Put(0, { value: depositAmount });

    // Advance time past unlockTime (which was set to block.timestamp)
    await ethers.provider.send("evm_increaseTime", [3600]);
    await ethers.provider.send("evm_mine", []);

    // Attempt to collect exactly 1 ether (balance == _am)
    // Original contract would succeed, mutant should revert
    await expect(
      instance.connect(addr1).Collect(depositAmount)
    ).to.be.reverted;
  });
});