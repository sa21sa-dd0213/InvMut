import { expect } from "chai";
import { ethers } from "hardhat";

describe("X_WALLET mutant me575be82 detection test", function () {
  it("should kill mutant by detecting incorrect unlockTime when _unlockTime <= block.timestamp", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for X_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy X_WALLET with Log address
    const Factory = await ethers.getContractFactory("X_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    // Get current block timestamp
    const blockNum = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNum);
    const currentTimestamp = block!.timestamp;
    
    // Call Put with _unlockTime less than current timestamp
    // In original: unlockTime will be set to block.timestamp
    // In mutant: unlockTime will be set to block.prevrandao (a random number)
    const putValue = ethers.parseEther("2");
    await instance.connect(addr1).Put(currentTimestamp - 100, { value: putValue });
    
    // Now attempt Collect with the full balance
    // In original: block.timestamp > unlockTime (since unlockTime = block.timestamp, strict > fails)
    // We need to wait at least 1 second for original to work
    await ethers.provider.send("evm_increaseTime", [1]);
    await ethers.provider.send("evm_mine", []);
    
    // Check that collect succeeds in original but will likely fail in mutant
    // because block.prevrandao is much larger than current timestamp
    const collectAmount = ethers.parseEther("1");
    
    // In the mutant, block.prevrandao will be some large random number
    // so block.timestamp > acc.unlockTime will be false, causing revert
    await expect(
      instance.connect(addr1).Collect(collectAmount)
    ).to.be.reverted;
  });
});