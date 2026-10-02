import { expect } from "chai";
import { ethers } } from "hardhat";

describe("W_WALLET mutant detection - m36b0aaa1", function () {
  it("should revert when balance < MinSum and balance < _am even if unlock time has passed (original AND logic)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy W_WALLET with Log address
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const wallet = await WalletFactory.deploy(await log.getAddress());
    await wallet.waitForDeployment();
    
    const walletAddress = await wallet.getAddress();
    
    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTime = blockBefore.timestamp;
    
    // Set unlock time to be in the past (so timestamp > unlockTime)
    const unlockTime = currentTime - 100;
    
    // Fund addr1 with some ETH (less than MinSum = 1 ether)
    await owner.sendTransaction({
      to: addr1.address,
      value: ethers.parseEther("0.5")
    });
    
    // addr1 calls Put with unlockTime in the past
    await wallet.connect(addr1).Put(unlockTime, { value: ethers.parseEther("0.5") });
    
    // Now addr1 tries to Collect an amount greater than their balance (0.5 ether)
    // and also less than MinSum (1 ether) - both conditions fail for the original AND logic
    // But with the mutant ||, the timestamp condition being true would allow the withdrawal
    await expect(
      wallet.connect(addr1).Collect(ethers.parseEther("0.6"))
    ).to.be.reverted;
    
    // Also test Collect with amount = balance but still < MinSum
    await expect(
      wallet.connect(addr1).Collect(ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});