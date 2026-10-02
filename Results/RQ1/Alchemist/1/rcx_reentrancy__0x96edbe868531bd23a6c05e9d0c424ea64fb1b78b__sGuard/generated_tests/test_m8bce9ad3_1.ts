import { expect } from "chai";
import { ethers } from "hardhat";

describe("PENNY_BY_PENNY mutant m8bce9ad3", function () {
  it("should revert when Collect is called before unlockTime (original behavior), but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy contracts
    const PennyFactory = await ethers.getContractFactory("PENNY_BY_PENNY");
    const LogFactory = await ethers.getContractFactory("LogFile");
    
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    const pennyInstance = await PennyFactory.deploy();
    await pennyInstance.waitForDeployment();
    
    // Initialize the contract
    await pennyInstance.connect(owner).SetLogFile(await logInstance.getAddress());
    await pennyInstance.connect(owner).SetMinSum(ethers.parseEther("0.01"));
    await pennyInstance.connect(owner).Initialized();
    
    // Setup: addr1 puts 1 ETH with a lock time of 1 hour
    const lockTime = 3600; // 1 hour
    const putAmount = ethers.parseEther("1");
    await pennyInstance.connect(addr1).Put(lockTime, { value: putAmount });
    
    // Attempt to collect immediately (before unlockTime)
    const collectAmount = ethers.parseEther("0.5");
    
    // This should revert in the original (block.timestamp < unlockTime),
    // but the mutant (< instead of >) will allow it to succeed
    await expect(
      pennyInstance.connect(addr1).Collect(collectAmount)
    ).to.be.reverted;
  });
});