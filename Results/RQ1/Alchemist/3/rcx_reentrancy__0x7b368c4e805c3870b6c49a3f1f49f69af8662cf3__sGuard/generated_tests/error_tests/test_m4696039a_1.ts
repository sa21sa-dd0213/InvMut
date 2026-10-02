import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant test - block.timestamp >= acc.unlockTime", function () {
  it("should revert when block.timestamp equals unlockTime in original (strict >) but pass in mutant (>=)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for W_WALLET)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy W_WALLET with the Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    // Get current block timestamp
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    const currentTimestamp = blockBefore!.timestamp;
    
    // Set unlockTime to exactly the current timestamp by calling Put with current timestamp
    // (Put sets unlockTime to max(_unlockTime, block.timestamp))
    await instance.connect(addr1).Put(currentTimestamp, { value: ethers.parseEther("2") });
    
    // Try to collect exactly at the unlock time (current timestamp)
    // Original contract requires block.timestamp > acc.unlockTime, so this should revert
    // Mutant changes to >=, so this would succeed
    await expect(
      instance.connect(addr1).Collect(ethers.parseEther("1"))
    ).to.be.reverted;
  });
});