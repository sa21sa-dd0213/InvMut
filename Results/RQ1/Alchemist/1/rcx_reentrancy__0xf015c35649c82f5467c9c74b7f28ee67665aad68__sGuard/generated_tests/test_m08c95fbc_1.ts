import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant m08c95fbc test", function () {
  it("should detect the mutant by verifying Collect reverts when unlock time is in the future", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bankInstance = await BankFactory.deploy(await logInstance.getAddress());
    await bankInstance.waitForDeployment();
    
    const bankAddress = await bankInstance.getAddress();
    
    // Set a future unlock time (current timestamp + 1 hour in seconds)
    const latestBlock = await ethers.provider.getBlock("latest");
    const futureUnlockTime = latestBlock!.timestamp + 3600;
    
    // Send 2 ether to Put with future unlock time
    const depositAmount = ethers.parseEther("2");
    const minSum = ethers.parseEther("1");
    
    await expect(
      bankInstance.connect(addr1).Put(futureUnlockTime, { value: depositAmount })
    ).to.not.be.reverted;
    
    // Verify balance was credited
    const holderInfo = await bankInstance.Acc(addr1.address);
    expect(holderInfo.balance).to.equal(depositAmount);
    
    // Try to Collect immediately - should revert because unlock time is in the future
    const collectAmount = ethers.parseEther("1");
    
    // On original: Collect reverts because block.timestamp < unlockTime
    // On mutant: Collect might succeed because unlockTime was set to block.timestamp instead of future time
    await expect(
      bankInstance.connect(addr1).Collect(collectAmount)
    ).to.be.reverted;
  });
});