import { expect } from "chai";
import { ethers } from "hardhat";

describe("ACCURAL_DEPOSIT mutant m52a5a51a test", function () {
  it("should kill mutant where Collect condition uses <= instead of >=", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy with constructor arguments (LogFile address)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();

    const Factory = await ethers.getContractFactory("ACCURAL_DEPOSIT");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set the LogFile address
    await instance.connect(owner).SetLogFile(await logFile.getAddress());

    // Initialize the contract
    await instance.connect(owner).Initialized();

    // Set MinSum to 1 ether (default)
    const MinSum = ethers.parseEther("1");

    // User deposits 2 ether (greater than MinSum)
    const depositAmount = ethers.parseEther("2");
    await instance.connect(user).Deposit({ value: depositAmount });

    // Verify user balance is greater than MinSum
    const userBalance = await instance.balances(user.address);
    expect(userBalance).to.equal(depositAmount);
    expect(userBalance).to.be.gt(MinSum);

    // Try to collect 1 ether - should succeed in original but revert in mutant
    const collectAmount = ethers.parseEther("1");

    // This transaction should revert because mutant checks balance <= MinSum (2 <= 1 is false)
    await expect(
      instance.connect(user).Collect(collectAmount)
    ).to.be.reverted;
  });
});