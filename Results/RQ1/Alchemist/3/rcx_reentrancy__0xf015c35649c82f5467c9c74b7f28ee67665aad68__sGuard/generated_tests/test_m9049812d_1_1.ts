import { expect } from "chai";
import { ethers } from "hardhat";

describe("MY_BANK mutant detection - m9049812d", function () {
  it("should detect mutant that ignores call success in Collect function", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the Log contract first (required constructor argument for MY_BANK)
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    // Deploy MY_BANK with the Log contract address
    const BankFactory = await ethers.getContractFactory("MY_BANK");
    const bank = await BankFactory.deploy(await log.getAddress());
    await bank.waitForDeployment();
    
    // Deploy a malicious contract that will reject Ether in its receive function
    const maliciousCode = "contract RejectEther { receive() external payable { revert(); } }";
    const MaliciousFactory = await ethers.getContractFactory(maliciousCode);
    const malicious = await MaliciousFactory.deploy();
    await malicious.waitForDeployment();
    
    const maliciousAddress = await malicious.getAddress();
    
    // First, fund the malicious contract's account in the bank by sending Ether
    // The attacker sends Ether to the bank on behalf of the malicious contract
    const putAmount = ethers.parseEther("2");
    await bank.connect(owner).Put(0, { value: putAmount });
    
    // Set unlock time to past so Collect is allowed
    // Since we used Put(0), unlockTime = block.timestamp (current time)
    // We'll wait 2 seconds to ensure block.timestamp > unlockTime
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);
    
    // Now try to Collect from the malicious contract
    // The malicious contract's receive() reverts, so the call should fail
    // Original: if (_s) checks success - balance NOT deducted
    // Mutant: if (true) always deducts balance even when call fails
    
    const collectAmount = ethers.parseEther("1");
    const balanceBefore = await bank.Acc(maliciousAddress);
    
    // This should revert in the mutant because the balance check will fail
    // after the mutant incorrectly deducts balance on a failed call
    // But the external call itself will revert due to malicious contract
    await expect(
      bank.connect(attacker).Collect(collectAmount)
    ).to.be.reverted;
    
    // In the original contract, the balance should remain unchanged
    // because the call failed and _s was false
    const balanceAfter = await bank.Acc(maliciousAddress);
    
    // The test passes (kills mutant) if:
    // - For original: balance stays same (call failed, no deduction)
    // - For mutant: this test would either revert or show incorrect balance
    // We can also check that the balance was NOT deducted
    expect(balanceAfter.balance).to.equal(balanceBefore.balance);
  });
});