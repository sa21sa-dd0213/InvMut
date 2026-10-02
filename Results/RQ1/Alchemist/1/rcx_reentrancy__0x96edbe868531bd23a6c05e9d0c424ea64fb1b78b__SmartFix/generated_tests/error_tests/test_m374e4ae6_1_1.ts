import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant test for m374e4ae6", function () {
  it("should detect the arithmetic mutation in Collect (balance addition instead of subtraction)", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy contracts
    const LogFactory = await ethers.getContractFactory("LogFile");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    const PennyFactory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const penny = await PennyFactory.deploy();
    await penny.waitForDeployment();

    // Setup: initialize the contract and set minimum sum to 0 for easy testing
    await penny.connect(owner).SetLogFile(await log.getAddress());
    await penny.connect(owner).SetMinSum(0);
    await penny.connect(owner).Initialized();

    // User deposits 2 ETH with lock time of 1 second
    const depositAmount = ethers.parseEther("2");
    const lockTime = 1;

    await penny.connect(user).Put(lockTime, { value: depositAmount });

    // Wait for lock time to expire
    await ethers.provider.send("evm_increaseTime", [lockTime + 1]);
    await ethers.provider.send("evm_mine", []);

    // Check initial balance after deposit
    const holderBefore = await penny.Acc(user.address);
    const balanceBefore = holderBefore.balance;
    expect(balanceBefore).to.equal(depositAmount);

    // User collects 1 ETH
    const collectAmount = ethers.parseEther("1");
    await penny.connect(user).Collect(collectAmount);

    // Check balance after collection
    // Original: balance should decrease (deposit - collect = 1 ETH)
    // Mutant: balance would increase (deposit + collect = 3 ETH)
    const holderAfter = await penny.Acc(user.address);
    const balanceAfter = holderAfter.balance;

    // If mutant is present, balanceAfter would be depositAmount + collectAmount = 3 ETH
    // If original, balanceAfter would be depositAmount - collectAmount = 1 ETH
    expect(balanceAfter).to.equal(depositAmount - collectAmount);
  });
});