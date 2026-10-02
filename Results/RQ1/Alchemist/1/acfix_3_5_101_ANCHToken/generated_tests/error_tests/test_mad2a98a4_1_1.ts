import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant detection - mad2a98a4", function () {
  it("should kill mutant that removes balance check in _tokenBuyTransferReward", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy with router and USD token addresses
    // Using zero addresses for simplicity since we only need token transfers
    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(
      ethers.ZeroAddress,
      ethers.ZeroAddress
    );
    await instance.waitForDeployment();
    
    // Get the contract address
    const contractAddress = await instance.getAddress();
    
    // Set minTxnAmount to a low value so rewards are triggered
    await instance.setMinTxnAmount(ethers.parseEther("1"));
    
    // Set reward rate
    await instance.setRewardRate(5);
    
    // Transfer some tokens to the contract address to simulate having balance
    const transferAmount = ethers.parseEther("100");
    await instance.transfer(contractAddress, transferAmount);
    
    // Now drain the contract balance completely
    const allBalance = await instance.balanceOf(contractAddress);
    if (allBalance > 0n) {
      await instance.connect(owner).transfer(addr2.address, allBalance);
    }
    
    // Verify contract has 0 balance
    const zeroBalance = await instance.balanceOf(contractAddress);
    expect(zeroBalance).to.equal(0n);
    
    // Set minTxnAmount to 1 wei so any transfer triggers reward check
    await instance.setMinTxnAmount(1);
    
    // Make a transfer - in original, the reward check fails (0 >= rewardAmount is false)
    // In mutant, it always enters the if block and tries to sub from 0 balance
    // This will cause an underflow revert in SafeMath
    
    // For original: should succeed
    // For mutant: should revert with underflow
    // Since we're testing the original (hoping to kill mutant), we expect success
    // But if the test fails, that means the mutant was detected
    
    // The test should pass on original and fail on mutant
    // So we expect this to succeed on original
    await instance.transfer(addr1.address, ethers.parseEther("10"));
    
    // If we reach here, the original contract handled it correctly
    // (reward was skipped due to insufficient balance)
    
    // To properly kill the mutant, we need to show it would fail
    // So our test asserts that the transfer succeeds despite low contract balance
    
    // Verify the transfer happened
    const addr1Balance = await instance.balanceOf(addr1.address);
    expect(addr1Balance).to.equal(ethers.parseEther("10"));
  });
});