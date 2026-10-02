import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant test - ma9ce275e", function () {
  it("should revert Collect when unlock time is extended by a subsequent Put with longer lock time", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy MONEY_BOX (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy Log contract (MONEY_BOX needs a LogFile)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Initialize MONEY_BOX: set MinSum, set LogFile, then call Initialized
    await (await instance.SetMinSum(ethers.parseEther("0.1"))).wait();
    await (await instance.SetLogFile(await logInstance.getAddress())).wait();
    await (await instance.Initialized()).wait();

    // User deposits 1 ETH with a short lock time (e.g., 1 second)
    const shortLockTime = 1;
    const depositAmount = ethers.parseEther("1");
    await (await instance.connect(user).Put(shortLockTime, { value: depositAmount })).wait();

    // User deposits another 1 ETH with a very long lock time (e.g., 1 year = 31536000 seconds)
    const longLockTime = 31536000;
    await (await instance.connect(user).Put(longLockTime, { value: depositAmount })).wait();

    // Fast-forward time to after the short lock time but before the long lock time expires
    await ethers.provider.send("evm_increaseTime", [shortLockTime + 10]);
    await ethers.provider.send("evm_mine", []);

    // Attempt to collect 0.5 ETH - should revert because unlock time was extended to longLockTime
    const collectAmount = ethers.parseEther("0.5");
    await expect(
      instance.connect(user).Collect(collectAmount)
    ).to.be.reverted;
  });
});