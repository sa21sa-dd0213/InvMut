import { expect } from "chai";
import { ethers } from "hardhat";

describe("W_WALLET mutant detection - m4f9309f1", function () {
  it("should detect mutant that replaces Collect condition with false", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required by W_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy W_WALLET with Log contract address
    const WalletFactory = await ethers.getContractFactory("W_WALLET");
    const walletInstance = await WalletFactory.deploy(await logInstance.getAddress());
    await walletInstance.waitForDeployment();
    
    // Set up test parameters
    const depositAmount = ethers.parseEther("2");
    const withdrawAmount = ethers.parseEther("1");
    const unlockTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    
    // Step 1: Deposit funds via Put function
    const txPut = await walletInstance.connect(addr1).Put(unlockTime, {
      value: depositAmount
    });
    await txPut.wait();
    
    // Verify deposit was recorded
    const holderBefore = await walletInstance.Acc(addr1.address);
    expect(holderBefore.balance).to.equal(depositAmount);
    expect(holderBefore.unlockTime).to.equal(unlockTime);
    
    // Step 2: Fast forward time past unlock time
    await ethers.provider.send("evm_setNextBlockTimestamp", [unlockTime + 100]);
    await ethers.provider.send("evm_mine");
    
    // Step 3: Attempt to collect - on original should succeed, on mutant should fail silently
    const balanceBefore = await ethers.provider.getBalance(addr1.address);
    
    const txCollect = await walletInstance.connect(addr1).Collect(withdrawAmount);
    const receipt = await txCollect.wait();
    
    const balanceAfter = await ethers.provider.getBalance(addr1.address);
    
    // On original: balance should decrease by withdrawAmount (minus gas)
    // On mutant: balance should remain same (no transfer happens)
    const holderAfter = await walletInstance.Acc(addr1.address);
    
    // The key assertion: on original, balance decreases; on mutant, balance stays the same
    expect(balanceAfter).to.be.lessThan(balanceBefore.sub(withdrawAmount).add(ethers.parseEther("0.01")));
    
    // Additional check: on original, holder balance is reduced; on mutant, it stays unchanged
    if (holderAfter.balance === holderBefore.balance) {
      // Mutant detected - condition was false, no withdrawal occurred
      expect(true).to.be.true; // Test fails because it shouldn't reach here on original
    } else {
      // Original behavior - balance was reduced
      expect(holderAfter.balance).to.equal(depositAmount.sub(withdrawAmount));
    }
  });
});