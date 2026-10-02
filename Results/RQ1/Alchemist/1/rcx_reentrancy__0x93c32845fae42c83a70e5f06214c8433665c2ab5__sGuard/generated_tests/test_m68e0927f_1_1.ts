import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant m68e0927f - kill with OR instead of AND", function () {
  it("should revert when acc.balance < MinSum but other conditions hold (original), but mutant incorrectly allows withdrawal", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required constructor argument for X_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy X_WALLET with Log address
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();

    // Setup: send exactly 0.5 ether to user's balance (less than MinSum which is 1 ether)
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("0.5")
    });

    // Transfer ownership of the 0.5 ether to user via fallback (Put with unlockTime 0)
    // Actually we need user to have balance, so user sends 0.5 ether via Put
    const tx = await instance.connect(user).Put(0, { value: ethers.parseEther("0.5") });
    await tx.wait();

    // Now user has 0.5 ether balance, which is less than MinSum (1 ether)
    // Try to Collect 0.5 ether - in original this should revert because balance < MinSum
    // In mutant, the OR condition makes it pass because balance >= _am AND timestamp > unlockTime

    // Advance time past unlockTime (unlockTime was set to block.timestamp since we passed 0)
    await ethers.provider.send("evm_increaseTime", [100]);
    await ethers.provider.send("evm_mine", []);

    // This should revert in original, but pass in mutant
    // We expect revert for the original behavior, which would kill the mutant if it passes
    await expect(
      instance.connect(user).Collect(ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});