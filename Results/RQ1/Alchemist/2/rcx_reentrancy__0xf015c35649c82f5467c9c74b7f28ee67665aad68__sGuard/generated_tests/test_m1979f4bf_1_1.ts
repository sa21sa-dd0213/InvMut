import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant detection test for m1979f4bf", function () {
  it("should allow withdrawal when balance > MinSum on original but revert on mutant", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required by MY_BANK constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();

    // Get MinSum value
    const minSum = await bank.MinSum();

    // Deposit amount greater than MinSum (e.g., MinSum + 1 ether)
    const depositAmount = minSum + ethers.parseEther("1");
    const unlockTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

    await bank.connect(user).Put(unlockTime, { value: depositAmount });

    // Fast forward time past unlockTime
    await ethers.provider.send("evm_setNextBlockTimestamp", [unlockTime + 1]);
    await ethers.provider.send("evm_mine");

    // Try to withdraw an amount less than balance (e.g., 1 ether)
    const withdrawAmount = ethers.parseEther("1");

    // This should succeed on original but fail on mutant because:
    // Original: acc.balance (minSum+1) >= MinSum ✓ and acc.balance >= _am ✓
    // Mutant:  acc.balance (minSum+1) <= MinSum ✗ (condition fails)
    await expect(
      bank.connect(user).Collect(withdrawAmount)
    ).to.be.reverted;
  });
});