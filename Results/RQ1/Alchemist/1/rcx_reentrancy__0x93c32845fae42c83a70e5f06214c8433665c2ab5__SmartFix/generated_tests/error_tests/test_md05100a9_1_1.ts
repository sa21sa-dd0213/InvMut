import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant kill test for md05100a9", function () {
  it("should revert when collecting amount greater than balance even if unlock time has passed", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for X_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();

    // Deploy X_WALLET with Log address
    const WalletFactory = await ethers.getContractFactory("X_WALLET");
    const walletInstance = await WalletFactory.deploy(await logInstance.getAddress());
    await walletInstance.waitForDeployment();

    // Fund the wallet with exactly 1 ether (MinSum)
    const depositAmount = ethers.parseEther("1");
    await walletInstance.connect(user).Put(0, { value: depositAmount });

    // Now try to collect more than balance (e.g., 2 ether) after unlock time
    // Since unlockTime was set to block.timestamp (Put with 0), time condition passes
    const collectAmount = ethers.parseEther("2");

    // Original requires: balance >= MinSum AND balance >= _am AND time condition
    // Mutant changes last AND to OR: balance >= MinSum && balance >= _am || time condition
    // With 1 ether balance and trying to collect 2 ether:
    // balance >= MinSum (1 >= 1) = true
    // balance >= _am (1 >= 2) = false
    // time condition (block.timestamp > unlockTime) = true (since unlockTime = block.timestamp, and some time passed)
    // Original: true && false && true = false -> revert
    // Mutant: true && false || true = false || true = true -> should succeed (but shouldn't!)

    await expect(
      walletInstance.connect(user).Collect(collectAmount)
    ).to.be.reverted;
  });
});