import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK - Kill mutant md0b4e9fd (Put: > replaced with <)", function () {
  it("should revert when Collect is called immediately after Put with a future unlockTime", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy Log contract first (needed as constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    // Set a future unlock time (e.g., 1 hour from now)
    const futureUnlock = (await ethers.provider.getBlock("latest"))!.timestamp + 3600;
    const depositAmount = ethers.parseEther("2");
    
    // User deposits with a future unlock time
    await bank.connect(user).Put(futureUnlock, { value: depositAmount });
    
    // Immediately try to collect - should revert because unlock time is in the future
    const collectAmount = ethers.parseEther("1");
    await expect(
      bank.connect(user).Collect(collectAmount)
    ).to.be.reverted;
  });
});