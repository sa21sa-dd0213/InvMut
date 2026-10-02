import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant kill test - m581c8688", function () {
  it("should kill mutant by verifying reward is not distributed for transfers below minTxnAmount", async function () {
    const [owner, buyer, recipient] = await ethers.getSigners();
    
    // Deploy the contract - need to provide constructor arguments
    // The constructor requires: address _route, address _USDToken
    // For testing, we'll use a placeholder Uniswap router address and a mock USD token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockUSDToken = await MockERC20.deploy();
    await mockUSDToken.waitForDeployment();
    
    // Use a placeholder address for the Uniswap router (not used in this test)
    const placeholderRouter = "0x0000000000000000000000000000000000000001";
    
    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(placeholderRouter, await mockUSDToken.getAddress());
    await instance.waitForDeployment();
    
    // Get the contract address
    const contractAddress = await instance.getAddress();
    
    // Get initial balances
    const initialBuyerBalance = await instance.balanceOf(buyer.address);
    const initialRecipientBalance = await instance.balanceOf(recipient.address);
    const initialContractBalance = await instance.balanceOf(contractAddress);
    
    // Set up authorized roles for the buyer (simulating buy scenario)
    // We need to set _allowedRoles for buyer - but there's no setter function exposed
    // Instead, we'll directly transfer tokens from owner to buyer first
    // Then test transfers from buyer to recipient
    
    // First, transfer some tokens to buyer from owner
    const transferAmount = ethers.parseEther("1000"); // Some initial tokens
    await instance.transfer(buyer.address, transferAmount);
    
    // Get the current minTxnAmount
    const minTxnAmount = await instance.minTxnAmount();
    
    // Create a transfer amount below minTxnAmount
    const smallTransferAmount = ethers.parseEther("1"); // 1 token, well below minTxnAmount
    
    // Record txReward before transfer
    const rewardBefore = await instance.txReward(recipient.address);
    
    // Execute transfer from buyer to recipient with amount below minTxnAmount
    await instance.connect(buyer).transfer(recipient.address, smallTransferAmount);
    
    // Check that txReward was NOT updated (should remain 0)
    const rewardAfter = await instance.txReward(recipient.address);
    expect(rewardAfter).to.equal(rewardBefore);
    
    // Verify the recipient received the tokens
    const recipientBalanceAfter = await instance.balanceOf(recipient.address);
    expect(recipientBalanceAfter).to.equal(initialRecipientBalance + smallTransferAmount);
    
    // The key assertion: if the mutant is alive (condition changed to true),
    // the reward would have been distributed even for small transfers.
    // In the original contract, reward is only distributed when tAmount >= minTxnAmount.
    // Since we transferred below minTxnAmount, no reward should be given.
    // This test will pass on original but fail on mutant because mutant distributes rewards anyway.
    
    // Additional check: verify contract balance hasn't decreased (no reward taken)
    const contractBalanceAfter = await instance.balanceOf(contractAddress);
    expect(contractBalanceAfter).to.equal(initialContractBalance);
  });
});