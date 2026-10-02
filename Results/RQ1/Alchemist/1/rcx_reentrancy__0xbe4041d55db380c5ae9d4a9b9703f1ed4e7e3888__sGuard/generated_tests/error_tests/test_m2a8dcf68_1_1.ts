import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant m2a8dcf68 test", function () {
  it("should detect the mutant by collecting less than full balance", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy MONEY_BOX (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy Log contract
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Initialize the contract
    await (await instance.connect(owner).SetLogFile(await logInstance.getAddress())).wait();
    await (await instance.connect(owner).SetMinSum(ethers.parseEther("1"))).wait();
    await (await instance.connect(owner).Initialized()).wait();

    // User deposits 10 ETH with lock time of 1 second
    const depositAmount = ethers.parseEther("10");
    const lockTime = 1;
    await (await instance.connect(user).Put(lockTime, { value: depositAmount })).wait();

    // Increase time to pass the unlock time
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);

    // Try to collect only 4 ETH (less than full balance)
    const collectAmount = ethers.parseEther("4");

    // This should succeed on original (balance >= 4) but fail on mutant (balance == 4 is false since balance is 10)
    await expect(
      instance.connect(user).Collect(collectAmount)
    ).to.be.reverted;
  });
});