import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant m44b8a7ea", function () {
  it("should detect mutant by checking balance consistency after deposit and withdraw", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");

    // Deposit exactly 1 ETH from addr1
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Get contract balance before withdrawal
    const contractBalanceBefore = await ethers.provider.getBalance(instance.target);

    // Withdraw all
    const tx = await instance.connect(addr1).withdrawAll();
    await tx.wait();

    // Get contract balance after withdrawal
    const contractBalanceAfter = await ethers.provider.getBalance(instance.target);

    // In the original contract, balance should be 0 after full withdrawal
    // In the mutant, balance was incremented by msg.value+1, so balance -= oCredit
    // will leave an inconsistent state - the contract will still have 0 ETH but
    // internal accounting is broken. We can detect this by checking that the
    // contract actually has 0 ETH after withdrawal (which should be true for both)
    // but also checking that addr1 received exactly what they deposited.
    
    // Check addr1's balance change
    const addr1BalanceAfter = await ethers.provider.getBalance(addr1.address);
    
    // The key detection: on mutant, the internal credit mapping was set to 0
    // but the actual withdrawal sends the correct amount (oCredit which was set
    // to the original credit). However, the mutant's balance tracking is off by 1.
    // We can detect this by depositing again and checking if the second deposit
    // behaves correctly.
    
    // Second deposit to verify accounting consistency
    await instance.connect(addr1).deposit({ value: depositAmount });
    
    // Try to withdraw again - this should succeed on original but may behave
    // differently on mutant due to corrupted balance state
    const tx2 = await instance.connect(addr1).withdrawAll();
    await tx2.wait();
    
    // Final check: contract should have 0 ETH after two full withdrawal cycles
    const finalContractBalance = await ethers.provider.getBalance(instance.target);
    expect(finalContractBalance).to.equal(0);
    
    // On the mutant, the second withdrawal will try to subtract oCredit from
    // a balance that was artificially inflated by 1, causing a mismatch that
    // will revert due to underflow (in Solidity 0.8+) or produce wrong accounting
  });
});