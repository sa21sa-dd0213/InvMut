import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert Collect when balance is sufficient but unlock time has not passed (original behavior); mutant incorrectly allows withdrawal", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const Factory = await ethers.getContractFactory("MY_BANK");
    const instance = await Factory.deploy(await log.getAddress());
    await instance.waitForDeployment();
    
    // Fund addr1 with enough balance
    const depositAmount = ethers.parseEther("2");
    const unlockTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour in future
    
    // Deposit funds
    await instance.connect(addr1).Put(unlockTime, { value: depositAmount });
    
    // Try to collect before unlock time
    const collectAmount = ethers.parseEther("1");
    
    // This should revert in original (time not passed), but mutant would allow it
    await expect(
      instance.connect(addr1).Collect(collectAmount)
    ).to.be.reverted;
  });
});