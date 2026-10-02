import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant detection - msg.value-1", function () {
  it("should detect mutant by sending exactly 1 wei and checking contract balance is zero", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Get initial balances
    const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
    const contractAddress = await instance.getAddress();
    
    // Send exactly 1 wei to trigger the go function
    const tx = await instance.connect(addr1).go({ value: 1 });
    await tx.wait();
    
    // Get final balances
    const contractBalanceAfter = await ethers.provider.getBalance(contractAddress);
    const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
    
    // Original contract: sends all 1 wei to target, then sends 0 to owner
    // Mutant: sends 0 wei to target (msg.value-1 = 0), then tries to send contract balance to owner
    // In mutant, contract still has 1 wei after call, so transfer will fail (insufficient balance for reentrancy check)
    // OR contract balance will be non-zero if transfer somehow succeeds
    
    // The key assertion: contract balance should be zero after execution
    expect(contractBalanceAfter).to.equal(0);
    
    // Also verify owner received the correct amount (original: 0 wei transferred to owner)
    // In original: ownerBalanceAfter = ownerBalanceBefore (since contract balance was 0 after call)
    // In mutant: transfer fails, so owner doesn't receive anything
    expect(ownerBalanceAfter).to.equal(ownerBalanceBefore);
  });
});