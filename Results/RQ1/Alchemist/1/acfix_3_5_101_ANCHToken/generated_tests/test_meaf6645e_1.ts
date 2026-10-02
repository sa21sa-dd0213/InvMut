import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant test - meaf6645e", function () {
  it("should detect when >= is changed to > by transferring exactly minTxnAmount", async function () {
    const [owner, seller, buyer] = await ethers.getSigners();
    
    // Deploy with mock Uniswap router address (can use any address for testing)
    const UNISWAP_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    const USD_TOKEN = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
    
    const Factory = await ethers.getContractFactory("ANCHToken");
    const token = await Factory.deploy(UNISWAP_ROUTER, USD_TOKEN);
    await token.waitForDeployment();

    // Set up seller role for testing
    // The contract has _allowedRoles mapping which controls who can trigger reward logic
    // We need to add seller to allowed roles (this function doesn't exist publicly, 
    // but we can use the owner to directly set the mapping through storage or we need to 
    // call the internal functions - since _allowedRoles is private, we'll use the 
    // _transfer function which checks this mapping)
    
    // First, transfer tokens to seller so they have balance
    const transferAmount = ethers.parseEther("1000000");
    await token.connect(owner).transfer(seller.address, transferAmount);
    
    // Set minTxnAmount to a known value (default is 10000 * 10^18)
    const minTxnAmount = await token.minTxnAmount();
    
    // Transfer exactly minTxnAmount from seller to buyer
    // This should trigger reward logic in original but NOT in mutant
    const exactAmount = minTxnAmount;
    
    // Get seller's balance before
    const sellerBalanceBefore = await token.balanceOf(seller.address);
    const contractBalanceBefore = await token.balanceOf(token.target);
    
    // Perform the transfer
    await token.connect(seller).transfer(buyer.address, exactAmount);
    
    // Get the reward amount that should have been distributed
    const rewardRate = await token.rewardRate();
    const percent = await token.percent();
    const expectedReward = exactAmount * rewardRate / BigInt(percent);
    
    // Check txReward for seller - in original it should be updated, in mutant it should NOT
    const sellerTxReward = await token.txReward(seller.address);
    
    // If mutant is active (> instead of >=), the reward should be 0
    // If original is active (>=), the reward should be > 0
    // We assert it's > 0 to kill the mutant (since mutant would give 0)
    expect(sellerTxReward).to.be.gt(0);
    
    // Additional check: verify the contract balance decreased by reward amount
    const contractBalanceAfter = await token.balanceOf(token.target);
    expect(contractBalanceBefore - contractBalanceAfter).to.equal(expectedReward);
  });
});