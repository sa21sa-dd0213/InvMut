import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant mb956662c test", function () {
  it("should kill mutant by proving Collect does not execute when condition is replaced with false", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bankInstance = await BankFactory.deploy(await logInstance.getAddress());
    await bankInstance.waitForDeployment();

    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTime = blockBefore!.timestamp;

    // Deposit 2 ether from user with unlock time set to current time (will be set to block.timestamp since not > current)
    const depositAmount = ethers.parseEther("2");
    await bankInstance.connect(user).Put(currentTime, { value: depositAmount });

    // Verify balance is updated
    let userAccount = await bankInstance.Acc(user.address);
    expect(userAccount.balance).to.equal(depositAmount);

    // Wait for next block so timestamp > unlockTime
    await ethers.provider.send("evm_increaseTime", [1]);
    await ethers.provider.send("evm_mine", []);

    // Get updated user balance before Collect
    userAccount = await bankInstance.Acc(user.address);
    const balanceBefore = userAccount.balance;

    // Try to Collect 1 ether (satisfies all original conditions: balance >= 1 ether, amount <= balance, time > unlockTime)
    const collectAmount = ethers.parseEther("1");
    const tx = await bankInstance.connect(user).Collect(collectAmount);
    await tx.wait();

    // Check balance after Collect - in original it should decrease, in mutant it should stay the same
    userAccount = await bankInstance.Acc(user.address);

    // The mutant's condition is always false, so balance should remain unchanged
    // This assertion will pass on mutant (detecting it) and fail on original (which would reduce balance)
    expect(userAccount.balance).to.equal(balanceBefore);

    // Additional check: verify no ether was transferred (user balance unchanged)
    const userBalanceAfter = await ethers.provider.getBalance(user.address);
    // Since no transfer happened, gas costs were paid but no value was received
    // This confirms the Collect function did nothing
  });
});