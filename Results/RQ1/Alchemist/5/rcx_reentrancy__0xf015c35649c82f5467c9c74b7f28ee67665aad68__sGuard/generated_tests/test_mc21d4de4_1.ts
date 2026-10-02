import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant kill test - mc21d4de4", function () {
  it("should allow withdrawal when balance > MinSum in original, but fail in mutant where condition is == MinSum", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    // Deposit 2 ether (greater than MinSum which is 1 ether)
    const depositAmount = ethers.parseEther("2");
    const unlockTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour in future
    
    await bank.connect(addr1).Put(unlockTime, { value: depositAmount });
    
    // Fast forward time past unlockTime
    await ethers.provider.send("evm_increaseTime", [7200]); // 2 hours
    await ethers.provider.send("evm_mine", []);
    
    // Try to collect 1 ether (valid amount)
    const collectAmount = ethers.parseEther("1");
    
    // This transaction should revert in the mutant because balance (2 ether) != MinSum (1 ether)
    await expect(
      bank.connect(addr1).Collect(collectAmount)
    ).to.be.reverted;
  });
});