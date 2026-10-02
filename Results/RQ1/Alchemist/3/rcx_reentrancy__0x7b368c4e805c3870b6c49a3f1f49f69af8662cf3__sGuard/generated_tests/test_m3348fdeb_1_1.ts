import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant kill test for m3348fdeb", function () {
  it("should allow partial withdrawal when balance >= amount, but mutant fails", async function () {
    const [owner, user] = await ethers.getSigners();

    // Deploy Log contract first (required by W_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();

    // Deploy W_WALLET with Log address
    const W_WALLETFactory = await ethers.getContractFactory("W_WALLET");
    const wallet = await W_WALLETFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();

    // Fund user with ETH
    const depositAmount = ethers.parseEther("2.0");
    const withdrawAmount = ethers.parseEther("1.0");

    // User deposits 2 ETH via Put() with unlock time = 0 (immediately accessible)
    await wallet.connect(user).Put(0, { value: depositAmount });

    // Verify balance is 2 ETH
    const holder = await wallet.Acc(user.address);
    expect(holder.balance).to.equal(depositAmount);

    // Fast forward time past unlockTime (which was set to block.timestamp)
    await ethers.provider.send("evm_increaseTime", [3600]); // +1 hour
    await ethers.provider.send("evm_mine", []);

    // Attempt to withdraw only 1 ETH (partial withdrawal)
    // Original contract: succeeds because 2 >= 1
    // Mutant: reverts because 2 != 1
    const tx = wallet.connect(user).Collect(withdrawAmount);

    // The mutant should revert because balance (2 ETH) != withdrawAmount (1 ETH)
    await expect(tx).to.be.reverted;
  });
});