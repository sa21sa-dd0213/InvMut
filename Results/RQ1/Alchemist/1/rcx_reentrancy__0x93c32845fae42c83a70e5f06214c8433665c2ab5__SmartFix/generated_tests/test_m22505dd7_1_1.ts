import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant detection - m22505dd7", function () {
  it("should detect mutant where Collect uses < instead of > for unlockTime comparison", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy X_WALLET with log address
    const XWalletFactory = await ethers.getContractFactory("X_WALLET");
    const wallet = await XWalletFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();

    // Set a future unlock time (e.g., 1 hour from now)
    const currentTime = Math.floor(Date.now() / 1000);
    const futureUnlockTime = currentTime + 3600; // 1 hour in the future

    // First put some ether into the wallet
    const depositAmount = ethers.parseEther("2");
    await wallet.connect(user).Put(futureUnlockTime, { value: depositAmount });

    // Verify balance is recorded
    const userBalance = (await wallet.Acc(user.address)).balance;
    expect(userBalance).to.equal(depositAmount);

    // Wait for unlock time to pass (simulate by mining blocks)
    await ethers.provider.send("evm_setNextBlockTimestamp", [futureUnlockTime + 100]);
    await ethers.provider.send("evm_mine");

    // Now attempt to collect - should succeed on original, fail on mutant
    const collectAmount = ethers.parseEther("1");

    // On the original contract this would succeed (block.timestamp > unlockTime)
    // On the mutant this will revert (block.timestamp < unlockTime is false)
    await expect(
      wallet.connect(user).Collect(collectAmount)
    ).to.be.reverted;

    // Verify balance is unchanged (since collect should have failed on mutant)
    const balanceAfter = (await wallet.Acc(user.address)).balance;
    expect(balanceAfter).to.equal(depositAmount);
  });
});