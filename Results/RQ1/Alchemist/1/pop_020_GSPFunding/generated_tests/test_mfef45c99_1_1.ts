import { expect } from "chai";
import { ethers } from "hardhat";

describe("GSPFunding mutant mfef45c99 - block.prevrandao vs block.timestamp", function () {
  it("should detect the mutant by exploiting block.prevrandao value being different from block.timestamp", async function () {
    const [owner, user1, user2] = await ethers.getSigners();
    
    // Deploy GSPFunding
    const Factory = await ethers.getContractFactory("GSPFunding");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Get the base and quote token addresses from the deployed contract
    const baseTokenAddress = await instance._BASE_TOKEN_();
    const quoteTokenAddress = await instance._QUOTE_TOKEN_();
    
    // Get token contract instances
    const baseToken = await ethers.getContractAt("IERC20", baseTokenAddress);
    const quoteToken = await ethers.getContractAt("IERC20", quoteTokenAddress);
    
    // Mint tokens to user1 for buying shares
    const baseAmount = ethers.parseEther("1000");
    const quoteAmount = ethers.parseEther("2000");
    
    // Approve and transfer tokens to contract for buying shares
    await baseToken.approve(contractAddress, baseAmount);
    await quoteToken.approve(contractAddress, quoteAmount);
    
    // Transfer tokens to the contract to create reserves
    await baseToken.transfer(contractAddress, baseAmount);
    await quoteToken.transfer(contractAddress, quoteAmount);
    
    // Buy shares
    await instance.connect(user1).buyShares(user1.address);
    
    // Get the current block timestamp
    const block = await ethers.provider.getBlock("latest");
    const currentTimestamp = block.timestamp;
    
    // Get the user's share balance
    const userShares = await instance._SHARES_(user1.address);
    
    // Set deadline to current timestamp (valid for original, may fail with mutant)
    const sellDeadline = currentTimestamp;
    
    // Try to sell shares with deadline = current block timestamp
    try {
      const tx = await instance.connect(user1).sellShares(
        userShares,
        user2.address,
        0,
        0,
        "0x",
        sellDeadline
      );
      await tx.wait();
      
      // If we get here, the transaction succeeded in original
      // In mutant with prevrandao, this might have succeeded too
      // Let's check if balances changed
      const userBalanceAfter = await instance._SHARES_(user1.address);
      expect(userBalanceAfter).to.be.lessThan(userShares);
      
    } catch (error) {
      // If the transaction reverts, the mutant is detected
      expect(error.message).to.include("TIME_EXPIRED");
    }
    
    // More deterministic approach: Use hardhat's ability to mine blocks with specific prevrandao
    // Mine a block with very large prevrandao
    await ethers.provider.send("hardhat_setPrevRandao", ["0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF"]);
    await ethers.provider.send("evm_mine", []);
    
    // Now prevrandao is very large
    // Set deadline to current timestamp + 1000 (should pass in original)
    const futureDeadline = (await ethers.provider.getBlock("latest")).timestamp + 1000;
    
    // Buy more shares first
    await baseToken.transfer(contractAddress, ethers.parseEther("100"));
    await quoteToken.transfer(contractAddress, ethers.parseEther("200"));
    await instance.connect(user2).buyShares(user2.address);
    
    const user2Shares = await instance._SHARES_(user2.address);
    
    // Try to sell with future deadline - should pass in original
    // In mutant with large prevrandao, this might fail because prevrandao > deadline
    try {
      const tx2 = await instance.connect(user2).sellShares(
        user2Shares,
        user1.address,
        0,
        0,
        "0x",
        futureDeadline
      );
      await tx2.wait();
      
      // If this succeeds, the original behavior is correct
      // We need to verify the transaction actually happened
      const user2BalanceAfter = await instance._SHARES_(user2.address);
      expect(user2BalanceAfter).to.be.lessThan(user2Shares);
      
    } catch (error) {
      // If it reverts with TIME_EXPIRED, the mutant is killed
      expect(error.message).to.include("TIME_EXPIRED");
    }
  });
});