import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant detection - m68e0927f", function () {
  it("should kill mutant by attempting Collect when balance < MinSum but >= _am and unlockTime passed", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (needed as constructor argument)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy W_WALLET with Log address
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const wallet = await WalletFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();
    
    const walletAddress = await wallet.getAddress();
    
    // Fund user with 0.5 ether (less than MinSum which is 1 ether)
    await owner.sendTransaction({
      to: walletAddress,
      value: ethers.parseEther("0.5")
    });
    
    // Get current time and set unlock time to past
    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    const currentTime = block.timestamp;
    
    // Call Put with unlockTime in the past to ensure unlock condition is met
    await wallet.connect(user).Put(currentTime - 100, { value: ethers.parseEther("0.5") });
    
    // Attempt to collect 0.5 ether - this should FAIL on original (balance < MinSum)
    // but should SUCCEED on mutant (because || allows it when balance >= _am and time passed)
    // We expect revert on original, so if it doesn't revert, mutant is killed
    await expect(
      wallet.connect(user).Collect(ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});