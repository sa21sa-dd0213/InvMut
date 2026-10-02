import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant test - m41e87ecb", function () {
  it("should allow collecting less than full balance (original behavior) but mutant reverts", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy LogFile first (required by PENNY_BY_PENNY)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();

    // Deploy PENNY_BY_PENNY (no constructor arguments)
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Setup: set MinSum, set LogFile, and initialize
    await instance.connect(owner).SetMinSum(ethers.parseEther("0.1"));
    await instance.connect(owner).SetLogFile(await logFile.getAddress());
    await instance.connect(owner).Initialized();

    // User deposits 2 ETH with lock time of 1 second
    const depositAmount = ethers.parseEther("2");
    await instance.connect(user).Put(1, { value: depositAmount });

    // Wait for unlock time to pass
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine");

    // User tries to collect 1 ETH (less than full balance of 2 ETH)
    const collectAmount = ethers.parseEther("1");

    // On original contract this succeeds; on mutant (balance==_am) this should revert
    await expect(
      instance.connect(user).Collect(collectAmount)
    ).to.be.reverted;
  });
});