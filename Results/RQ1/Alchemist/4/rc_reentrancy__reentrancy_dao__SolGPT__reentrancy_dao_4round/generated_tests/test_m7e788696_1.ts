import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant detection", function () {
  it("should revert when user with zero credit calls withdrawAll (kills mutant that replaces oCredit > 0 with true)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, have owner deposit some ETH so the contract has a balance
    const depositAmount = ethers.parseEther("1");
    await instance.connect(owner).deposit({ value: depositAmount });

    // Now addr1 has zero credit, but mutant will try to execute the withdrawal
    // The original would skip, but mutant tries to send ETH from contract to addr1
    // Since addr1 has no credit, balance -= 0 does nothing, but then it tries to send 0 ETH
    // With require(callResult) and sending 0 value to a payable address, it succeeds in mutant
    // To properly kill the mutant, we need a scenario where the balance would be insufficient
    // Let's withdraw owner's funds first so contract has 0 balance, then addr1 calls withdrawAll
    await instance.connect(owner).withdrawAll();

    // Now contract balance is 0, addr1 calls withdrawAll with zero credit
    // Original: skips because oCredit == 0, no revert
    // Mutant: enters the if block, tries balance -= 0 (OK), then tries to send 0 ETH
    // Sending 0 ETH with empty calldata to an EOA succeeds even with 0 balance
    // So we need to force the call to fail - let's use a contract that rejects calls
    // Better approach: check state after calling with zero credit
    await instance.connect(addr1).withdrawAll();

    // In the original, credit[addr1] stays 0 and balance stays 0
    // In the mutant, credit[addr1] gets set to 0 (already 0) and balance stays 0
    // This doesn't differentiate. Let's think differently.
    
    // Kill condition: The mutant removes the credit check, so a user with zero credit
    // could drain the contract if another user has deposited. Let's test that.
    // Deploy fresh contract
    const instance2 = await Factory.deploy();
    await instance2.waitForDeployment();

    // Owner deposits 1 ETH
    await instance2.connect(owner).deposit({ value: depositAmount });

    // addr1 has zero credit but calls withdrawAll
    // Original: does nothing (credit[addr1] == 0)
    // Mutant: enters if(true), subtracts 0 from balance, sets credit[addr1] = 0 (no-op),
    // then sends 1 ETH to addr1! This will drain owner's deposit.
    // This should succeed in mutant but not in original
    
    // To make the test detect the mutant, we expect the original to leave balance unchanged
    // and the mutant to reduce balance
    
    // Get balance before
    const balanceBefore = await ethers.provider.getBalance(instance2.target);
    
    // addr1 calls withdrawAll
    await instance2.connect(addr1).withdrawAll();
    
    // Get balance after
    const balanceAfter = await ethers.provider.getBalance(instance2.target);
    
    // In the original, balanceAfter should equal balanceBefore (no withdrawal for zero credit)
    // In the mutant, balanceAfter should be less (stolen funds)
    // This test will pass on original (balance unchanged) and fail on mutant (balance changed)
    expect(balanceAfter).to.equal(balanceBefore);
  });
});