import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant detection - timestamp equality", function () {
  it("should revert when collecting at exactly unlockTime (original behavior) but succeed on mutant", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy the Log contract first (required by X_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy X_WALLET with the Log contract address
    const WalletFactory = await ethers.getContractFactory("X_WALLET");
    const wallet = await WalletFactory.deploy(await logInstance.getAddress());
    await wallet.waitForDeployment();
    
    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTimestamp = blockBefore.timestamp;
    
    // Send ETH to the contract with unlockTime set to current timestamp
    // This means unlockTime == block.timestamp (the exact moment of Put)
    const putAmount = ethers.parseEther("2");
    await wallet.connect(user).Put(currentTimestamp, { value: putAmount });
    
    // Now try to collect exactly 1 ether
    // The condition in original: block.timestamp > acc.unlockTime (strictly greater)
    // In mutant: block.timestamp >= acc.unlockTime (greater or equal)
    // Since we set unlockTime == currentTimestamp, and we're in the same block,
    // block.timestamp should still equal unlockTime
    const collectAmount = ethers.parseEther("1");
    
    // This transaction should revert on the original (strict >) 
    // but succeed on the mutant (>=)
    await expect(
      wallet.connect(user).Collect(collectAmount)
    ).to.be.reverted;
  });
});