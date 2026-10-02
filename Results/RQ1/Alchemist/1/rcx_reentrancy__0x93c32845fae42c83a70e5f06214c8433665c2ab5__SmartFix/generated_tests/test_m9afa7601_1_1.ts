import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant m9afa7601 test", function () {
  it("should detect mutant by verifying successful Collect after deposit and unlock time", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(log.target);
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("2");
    const collectAmount = ethers.parseEther("1");
    const unlockTime = Math.floor(Date.now() / 1000) + 60; // 1 minute from now

    // Deposit funds
    const txPut = await instance.connect(addr1).Put(unlockTime, { value: depositAmount });
    await txPut.wait();

    // Fast forward time past unlockTime
    await ethers.provider.send("evm_increaseTime", [120]);
    await ethers.provider.send("evm_mine", []);

    // Attempt to collect - should succeed on original, revert on mutant
    const txCollect = instance.connect(addr1).Collect(collectAmount);

    // On the mutant, this will revert because the success check is hardcoded to false
    await expect(txCollect).to.be.reverted;
  });
});