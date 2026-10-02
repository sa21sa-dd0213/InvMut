import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant m676ba3e8 - kill by bypassing minTxnAmount check in _tokenSellTransferReward", function () {
  it("should revert or not distribute reward when transfer amount is below minTxnAmount", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy with a Uniswap router address (use a dummy address since we won't interact with it)
    const Factory = await ethers.getContractFactory("ANCHToken");
    const dummyRouter = "0x0000000000000000000000000000000000000001";
    const dummyUSDToken = "0x0000000000000000000000000000000000000002";
    const instance = await Factory.deploy(dummyRouter, dummyUSDToken);
    await instance.waitForDeployment();

    // Get the initial minTxnAmount (10000 * 10^18)
    const minTxnAmount = await instance.minTxnAmount();
    
    // Setup: need to make addr1 an allowed role to trigger the _tokenSellTransferReward path
    // Since _allowedRoles is private, we need to find another way to trigger the sell path
    // The contract uses _allowedRoles mapping which is private, so we need to use the public interface
    // Looking at the code, the only way to trigger _tokenSellTransferReward is if sender has _allowedRoles[sender] = false and recipient has _allowedRoles[recipient] = true
    // Since we cannot set _allowedRoles directly, we need to use the existing flow
    
    // Alternative approach: transfer tokens to addr1 first, then from addr1 to owner (which would trigger sell if owner has allowed role)
    // But owner is the deployer and should have the role by default based on _mint in constructor
    
    // Actually, looking at the constructor, it calls _mint(msg.sender, _rTotal, _tTotal) which sets owner's balance
    // The _transfer function checks _allowedRoles[sender] || _allowedRoles[recipient]
    // Since we can't set _allowedRoles, let's test the condition differently
    
    // Let's test by transferring from owner to addr1 (buy path) and then from addr1 to owner (sell path)
    // For this we need addr1 to have some tokens
    
    // Transfer some tokens to addr1 to enable testing
    const transferAmount = ethers.parseEther("100");
    await instance.connect(owner).transfer(addr1.address, transferAmount);
    
    // Now try to transfer a very small amount (below minTxnAmount) back to owner
    // This should trigger _tokenSellTransferReward if owner has the allowed role
    const smallAmount = ethers.parseEther("1"); // 1 token, well below minTxnAmount (10000 * 10^18)
    
    // Get balance of contract before the transfer
    const contractBalanceBefore = await instance.balanceOf(instance.target);
    
    // Perform the small transfer from addr1 to owner
    const tx = await instance.connect(addr1).transfer(owner.address, smallAmount);
    const receipt = await tx.wait();
    
    // Get balance of contract after the transfer
    const contractBalanceAfter = await instance.balanceOf(instance.target);
    
    // Check if the contract's balance changed (which would indicate reward was taken)
    // In the original contract, since smallAmount < minTxnAmount, no reward should be distributed
    // In the mutant, the reward would be distributed regardless
    
    // The reward would deduct from contract balance and add to sender (addr1)
    // So if contract balance decreased, the mutant is active
    expect(contractBalanceAfter).to.equal(contractBalanceBefore, 
      "Contract balance should not change when transfer amount is below minTxnAmount");
    
    // Also verify that addr1's txReward was not incremented
    const addr1Reward = await instance.txReward(addr1.address);
    expect(addr1Reward).to.equal(0, 
      "No reward should be recorded for transfers below minTxnAmount");
  });
});