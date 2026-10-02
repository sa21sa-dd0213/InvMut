import { expect } from "chai";
import { ethers } } from "hardhat";

describe("MY_BANK mutant detection - Collect with false", function () {
  it("should succeed on original but revert on mutant when calling Collect after valid deposit", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument)
    const LogFactory = await ethers.getContractFactory("Log");
    const logContract = await LogFactory.deploy();
    await logContract.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await logContract.getAddress());
    await bank.waitForDeployment();
    
    const depositAmount = ethers.parseEther("2");
    const unlockTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    
    // Deposit from addr1
    await bank.connect(addr1).Put(unlockTime, { value: depositAmount });
    
    // Wait for unlock time (in test we can fast-forward time)
    await ethers.provider.send("evm_setNextBlockTimestamp", [unlockTime + 1]);
    await ethers.provider.send("evm_mine");
    
    // Now try to collect - this should succeed on original but revert on mutant
    const collectAmount = ethers.parseEther("1");
    
    // The mutant always reverts because _s is replaced with false
    // On the original, this call would succeed
    await expect(
      bank.connect(addr1).Collect(collectAmount)
    ).to.be.reverted;
  });
});