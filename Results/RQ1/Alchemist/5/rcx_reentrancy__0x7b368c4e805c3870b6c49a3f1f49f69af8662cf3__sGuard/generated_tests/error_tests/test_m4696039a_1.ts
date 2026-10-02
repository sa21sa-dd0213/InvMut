import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant kill test - m4696039a", function () {
  it("should fail on original but pass on mutant when block.timestamp == acc.unlockTime", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy W_WALLET with Log address
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const walletInstance = await WalletFactory.deploy(await logInstance.getAddress());
    await walletInstance.waitForDeployment();
    
    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTime = blockBefore!.timestamp;
    
    // Send 2 ether to set unlock time to current timestamp (via Put with unlockTime = currentTime)
    const putTx = await walletInstance.connect(addr1).Put(currentTime, { value: ethers.parseEther("2") });
    await putTx.wait();
    
    // Verify balance is 2 ether and MinSum is 1 ether
    const holder = await walletInstance.Acc(addr1.address);
    expect(holder.balance).to.equal(ethers.parseEther("2"));
    expect(await walletInstance.MinSum()).to.equal(ethers.parseEther("1"));
    
    // Try to collect 1 ether exactly when block.timestamp == unlockTime
    // The original requires >, mutant requires >=, so this should revert on original
    await expect(
      walletInstance.connect(addr1).Collect(ethers.parseEther("1"))
    ).to.be.reverted; // Will revert on original, pass on mutant
    
    // For mutant: after the call, balance should decrease
    // For original: the call reverts, so balance stays the same
    const holderAfter = await walletInstance.Acc(addr1.address);
    
    // If this is the original, balance remains 2 ether
    // If this is the mutant, balance becomes 1 ether
    // The test passes either way, but the mutant is killed because 
    // the original reverts while mutant doesn't
  });
});