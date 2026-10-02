import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant kill test - Put block.timestamp replaced with block.prevrandao", function () {
  it("should detect mutant by testing unlock time behavior", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (required by W_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy W_WALLET with Log address
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const wallet = await WalletFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();
    
    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTimestamp = blockBefore!.timestamp;
    
    // Set unlock time far in the future
    const futureUnlockTime = currentTimestamp + 10000;
    
    // User puts 1 ether with future unlock time
    const putTx = await wallet.connect(user).Put(futureUnlockTime, { value: ethers.parseEther("1") });
    await putTx.wait();
    
    // Check the stored unlock time - on original it should be futureUnlockTime
    const holder = await wallet.Acc(user.address);
    
    // Try to collect immediately (should fail on original because unlock time is in future)
    // On mutant, block.prevrandao may be small, so unlockTime could be set to current timestamp
    // allowing the collect to succeed when it shouldn't
    await expect(
      wallet.connect(user).Collect(ethers.parseEther("1"))
    ).to.be.reverted;
    
    // Additional check: verify unlock time is actually in the future
    expect(holder.unlockTime).to.be.greaterThan(currentTimestamp);
  });
});