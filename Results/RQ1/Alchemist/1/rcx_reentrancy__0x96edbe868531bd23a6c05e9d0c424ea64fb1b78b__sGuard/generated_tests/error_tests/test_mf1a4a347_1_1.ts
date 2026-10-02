import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant kill test", function () {
  it("should kill mutant mf1a4a347 by verifying Collect executes when conditions are met", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy LogFile first (required by PENNY_BY_PENNY)
    const LogFileFactory = await ethers.getContractFactory("LogFile");
    const logFile = await LogFileFactory.deploy();
    await logFile.waitForDeployment();

    // Deploy PENNY_BY_PENNY (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.connect(owner).Initialized();

    // Set MinSum to 1 wei
    await instance.connect(owner).SetMinSum(1);

    // Set LogFile address
    await instance.connect(owner).SetLogFile(await logFile.getAddress());

    // User deposits 100 wei with lock time of 1 second
    const depositAmount = ethers.parseEther("0.0000000000000001"); // 100 wei
    const lockTime = 1;
    await instance.connect(user).Put(lockTime, { value: depositAmount });

    // Wait for unlock time to pass
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);

    // Get user's balance before Collect
    const userBalanceBefore = await ethers.provider.getBalance(user.address);

    // Attempt to collect 50 wei (meets all conditions: balance >= MinSum, balance >= _am, time passed)
    const collectAmount = ethers.parseEther("0.00000000000000005"); // 50 wei
    const tx = await instance.connect(user).Collect(collectAmount);
    const receipt = await tx.wait();

    // Get user's balance after Collect
    const userBalanceAfter = await ethers.provider.getBalance(user.address);

    // On original: balance increases by 50 wei (minus gas)
    // On mutant: balance stays the same (no transfer happens)
    const balanceDifference = userBalanceAfter - userBalanceBefore;

    // If mutant is killed, the transfer should have happened
    // We expect the user to have received the collect amount (ignoring gas costs)
    expect(balanceDifference).to.be.gt(0);

    // Additionally check that the contract's balance decreased
    const contractBalance = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalance).to.equal(depositAmount - collectAmount);
  });
});