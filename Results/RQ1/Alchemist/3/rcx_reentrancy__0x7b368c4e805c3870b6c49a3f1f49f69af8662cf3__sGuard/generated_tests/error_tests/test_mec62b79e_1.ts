import { expect } from "chai";
import { ethers } } from "hardhat";

describe("W_WALLET mutant test for Put function (block.prevrandao vs block.timestamp)", function () {
  it("should revert Collect immediately after Put when _unlockTime is slightly above block.timestamp (original behavior); mutant should unexpectedly succeed", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy W_WALLET with Log address as constructor argument
    const Factory = await ethers.getContractFactory("W_WALLET");
    const wallet = await Factory.deploy(await log.getAddress());
    await wallet.waitForDeployment();
    
    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTimestamp = blockBefore.timestamp;
    
    // Set unlockTime to currentTimestamp + 100 (well above current time)
    const unlockTime = currentTimestamp + 100n;
    
    // User puts 2 ether with unlockTime slightly above current timestamp
    const putAmount = ethers.parseEther("2");
    await wallet.connect(user).Put(unlockTime, { value: putAmount });
    
    // Immediately try to collect 1 ether - should fail on original because unlockTime not reached
    const collectAmount = ethers.parseEther("1");
    
    // On the original contract, this should revert because block.timestamp <= acc.unlockTime
    // On the mutant (using block.prevrandao), the comparison may set unlockTime to the user-provided value
    // making the collect succeed when it should not
    await expect(
      wallet.connect(user).Collect(collectAmount)
    ).to.be.reverted;
  });
});