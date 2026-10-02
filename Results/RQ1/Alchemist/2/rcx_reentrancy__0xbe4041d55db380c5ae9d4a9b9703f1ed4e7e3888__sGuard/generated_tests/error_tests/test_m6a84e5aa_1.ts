import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant m6a84e5aa test", function () {
  it("should detect mutant by testing balance < MinSum but sufficient _am and unlock time passed", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set MinSum to 1 ether
    await instance.SetMinSum(ethers.parseEther("1"));
    await instance.Initialized();

    // Set LogFile to a dummy address (required for Put/Collect to work)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    await instance.SetLogFile(await logInstance.getAddress());

    // addr1 deposits 0.5 ether (less than MinSum of 1 ether)
    await instance.connect(addr1).Put(0, { value: ethers.parseEther("0.5") });

    // Advance time past unlockTime (Put with _lockTime=0 sets unlockTime to block.timestamp)
    await ethers.provider.send("evm_increaseTime", [1]);
    await ethers.provider.send("evm_mine");

    // Attempt to collect 0.3 ether - should revert on original (balance < MinSum)
    // but succeed on mutant (balance >= _am AND time condition satisfied due to ||)
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("0.3"))
    ).to.be.reverted;
  });
});