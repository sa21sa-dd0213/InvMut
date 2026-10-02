import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant m40a1c0eb", function () {
  it("should revert when collecting less than MinSum before unlock time in original, but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const Factory = await ethers.getContractFactory("MY_BANK");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    // addr1 deposits less than MinSum (1 ether) - deposit 0.5 ether
    const depositAmount = ethers.parseEther("0.5");
    await instance.connect(addr1).Put(0, { value: depositAmount });
    
    // Try to collect any positive amount before unlock time (block.timestamp > 0 is false since unlockTime was set to 0 which is <= block.timestamp)
    // Actually let's set unlock time far in the future to ensure condition fails
    const futureTime = Math.floor(Date.now() / 1000) + 1000000;
    await instance.connect(addr1).Put(futureTime, { value: ethers.parseEther("0.1") });
    
    // Now try to collect 0.1 ether - should revert in original because:
    // 1. balance (0.6 ether) < MinSum (1 ether)
    // 2. block.timestamp < unlockTime (future)
    const collectAmount = ethers.parseEther("0.1");
    
    // In the original, this would revert. In the mutant (if true), it would succeed.
    // Since we're testing against the deployed contract, we check if it succeeds (mutant behavior)
    // or reverts (original behavior) - we want to detect the mutant by it succeeding
    const tx = instance.connect(addr1).Collect(collectAmount);
    
    // The mutant replaces the condition with true, so the transaction should succeed
    // If the original code was present, it would revert
    await expect(tx).to.not.be.reverted;
    
    // Additional assertion: balance should be reduced if mutant is active
    const holder = await instance.Acc(addr1.address);
    expect(holder.balance).to.be.lt(depositAmount);
  });
});