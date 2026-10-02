import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant detection - block.timestamp replaced with block.prevrandao", function () {
  it("should detect mutant by testing time-based unlock condition", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (required by W_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy W_WALLET with Log address
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const wallet = await WalletFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();
    
    const walletAddress = await wallet.getAddress();
    
    // Send 2 ether to create an account with balance
    const depositAmount = ethers.parseEther("2");
    const tx = await user.sendTransaction({
      to: walletAddress,
      value: depositAmount
    });
    await tx.wait();
    
    // Check account was created
    let account = await wallet.Acc(user.address);
    expect(account.balance).to.equal(depositAmount);
    
    // Get current block timestamp
    const block = await ethers.provider.getBlock("latest");
    const currentTimestamp = block.timestamp;
    
    // Set unlock time to current timestamp + 10 seconds (in the future)
    const unlockTime = currentTimestamp + 10;
    
    // Call Put to set the unlock time
    const putTx = await wallet.connect(user).Put(unlockTime, { value: 0 });
    await putTx.wait();
    
    // Verify unlock time was set
    account = await wallet.Acc(user.address);
    expect(account.unlockTime).to.equal(unlockTime);
    
    // Try to collect immediately - should fail because unlock time hasn't passed
    const collectAmount = ethers.parseEther("1");
    
    // This should revert in original because block.timestamp <= unlockTime
    // In mutant, behavior depends on block.prevrandao which is random
    await expect(
      wallet.connect(user).Collect(collectAmount)
    ).to.be.reverted;
    
    // Mine blocks to advance time past the unlock time
    await ethers.provider.send("evm_increaseTime", [15]);
    await ethers.provider.send("evm_mine", []);
    
    // Now try to collect - should succeed in original (block.timestamp > unlockTime)
    // Should likely fail in mutant (block.prevrandao is random, not time-based)
    const collectTx = wallet.connect(user).Collect(collectAmount);
    
    // In original, this transaction should succeed
    await expect(collectTx).to.not.be.reverted;
    
    // Verify balance decreased
    account = await wallet.Acc(user.address);
    expect(account.balance).to.equal(depositAmount - collectAmount);
  });
});