import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant kill test - mc21d4de4", function () {
  it("should kill mutant by depositing more than MinSum and collecting when balance > MinSum", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required by MY_BANK constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    // Check MinSum value
    const minSum = await bank.MinSum();
    expect(minSum).to.equal(ethers.parseEther("1"));
    
    // Deposit 2 ether (more than MinSum)
    const depositAmount = ethers.parseEther("2");
    const unlockTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    
    await expect(
      bank.connect(addr1).Put(unlockTime, { value: depositAmount })
    ).to.not.be.reverted;
    
    // Verify balance is 2 ether
    const holderInfo = await bank.Acc(addr1.address);
    expect(holderInfo.balance).to.equal(depositAmount);
    
    // Wait for unlock time to pass (mine blocks to advance time)
    await ethers.provider.send("evm_setNextBlockTimestamp", [unlockTime + 1]);
    await ethers.provider.send("evm_mine");
    
    // Try to collect 1.5 ether (which should succeed on original but fail on mutant)
    const collectAmount = ethers.parseEther("1.5");
    
    // The mutant requires balance == MinSum (1 ether), but our balance is 2 ether
    // So this should revert on the mutant while succeeding on the original
    await expect(
      bank.connect(addr1).Collect(collectAmount)
    ).to.be.reverted;
  });
});