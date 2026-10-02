import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant kill test - mb956662c", function () {
  it("should kill mutant by verifying Collect succeeds when all conditions are met", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with Log address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    const bankAddress = await bank.getAddress();
    
    // Step 1: Put some ether into the bank with a future unlock time
    const depositAmount = ethers.parseEther("2");
    const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour in future
    
    await bank.connect(addr1).Put(futureTime, { value: depositAmount });
    
    // Verify initial balance
    let holder = await bank.Acc(addr1.address);
    expect(holder.balance).to.equal(depositAmount);
    expect(holder.unlockTime).to.equal(futureTime);
    
    // Step 2: Wait until unlock time has passed
    await ethers.provider.send("evm_setNextBlockTimestamp", [futureTime + 1]);
    await ethers.provider.send("evm_mine", []);
    
    // Step 3: Try to collect the minimum sum (MinSum = 1 ether)
    const collectAmount = ethers.parseEther("1");
    
    // Get balance before collect
    const balanceBefore = await ethers.provider.getBalance(addr1.address);
    
    // Execute Collect - on original it should succeed, on mutant it will silently fail
    const tx = await bank.connect(addr1).Collect(collectAmount);
    const receipt = await tx.wait();
    
    // Get balance after collect
    const balanceAfter = await ethers.provider.getBalance(addr1.address);
    
    // Check holder balance after collect
    holder = await bank.Acc(addr1.address);
    
    // If mutant is killed, the collect should have worked:
    // - Balance should have decreased by collectAmount (minus gas)
    // - Holder balance should be reduced
    // On the mutant (condition = false), nothing happens - no transfer, no balance change
    expect(holder.balance).to.be.lessThan(depositAmount);
    expect(holder.balance).to.equal(depositAmount - collectAmount);
    expect(balanceAfter).to.be.greaterThan(balanceBefore - collectAmount - receipt.gasUsed * receipt.gasPrice);
  });
});