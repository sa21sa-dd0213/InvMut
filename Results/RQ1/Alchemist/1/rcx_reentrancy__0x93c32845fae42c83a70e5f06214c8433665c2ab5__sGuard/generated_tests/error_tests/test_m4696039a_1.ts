import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant test - kill m4696039a", function () {
  it("should revert when collecting exactly at unlock time (original) but mutant would allow it", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy the Log contract first (needed as constructor argument for X_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy X_WALLET with the Log contract address
    const XWalletFactory = await ethers.getContractFactory("X_WALLET");
    const wallet = await XWalletFactory.deploy(await logInstance.getAddress());
    await wallet.waitForDeployment();
    
    // Set MinSum to 1 ether (default value, but let's confirm)
    // We'll use exactly 1 ether as the minimum
    
    // User sends 2 ether to Put with unlock time = current block timestamp + 100 seconds
    const depositAmount = ethers.parseEther("2");
    const currentBlock = await ethers.provider.getBlock("latest");
    const unlockTime = currentBlock.timestamp + 100;
    
    await wallet.connect(user).Put(unlockTime, { value: depositAmount });
    
    // Mine blocks to advance time to exactly the unlock time
    await ethers.provider.send("evm_setNextBlockTimestamp", [unlockTime]);
    await ethers.provider.send("evm_mine");
    
    // Verify we are exactly at unlock time
    const blockAfter = await ethers.provider.getBlock("latest");
    expect(blockAfter.timestamp).to.equal(unlockTime);
    
    // Try to collect 1 ether at exactly unlock time - should revert in original
    // because original requires block.timestamp > acc.unlockTime (strictly greater)
    const collectAmount = ethers.parseEther("1");
    await expect(
      wallet.connect(user).Collect(collectAmount)
    ).to.be.reverted;
    
    // Now advance one more second (past unlock time)
    await ethers.provider.send("evm_setNextBlockTimestamp", [unlockTime + 1]);
    await ethers.provider.send("evm_mine");
    
    // Should succeed now (both original and mutant allow this)
    const tx = await wallet.connect(user).Collect(collectAmount);
    await tx.wait();
    
    // Verify balance decreased
    const holder = await wallet.Acc(user.address);
    expect(holder.balance).to.equal(ethers.parseEther("1"));
  });
});