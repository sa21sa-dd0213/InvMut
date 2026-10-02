import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant test - kill md9c78625", function () {
  it("should distribute reward when tAmount >= minTxnAmount in _tokenBuyTransferReward", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy with Uniswap router and USDC addresses (using dummy addresses for testing)
    const UNISWAP_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    const USDC_TOKEN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    
    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(UNISWAP_ROUTER, USDC_TOKEN);
    await instance.waitForDeployment();
    
    // Set up allowed roles for testing
    // We need to add addr1 as an allowed role (buyer) to trigger _tokenBuyTransferReward
    // Note: _allowedRoles is private, so we need to use the owner to set it via available functions
    // Since there's no public function to set allowed roles, we'll need to use the contract's internal logic
    // For testing, we'll set addr1 as a buyer by making a transfer from owner (who is allowed)
    
    // Get initial balances
    const initialContractBalance = await instance.balanceOf(await instance.getAddress());
    const initialRecipientBalance = await instance.balanceOf(addr1.address);
    const initialRecipientReward = await instance.txReward(addr1.address);
    
    // Set minTxnAmount to a value we can exceed
    const minTxnAmount = await instance.minTxnAmount();
    
    // Transfer amount that exceeds minTxnAmount to trigger reward
    const transferAmount = minTxnAmount + ethers.parseEther("1000");
    
    // Perform transfer from owner to addr1 (this should trigger _tokenBuyTransferReward)
    // Owner is allowed by default as the contract creator
    await instance.connect(owner).transfer(addr1.address, transferAmount);
    
    // Check that the recipient's txReward was increased (reward distribution occurred)
    const finalRecipientReward = await instance.txReward(addr1.address);
    expect(finalRecipientReward).to.be.gt(initialRecipientReward);
    
    // Check that the contract balance decreased (reward tokens were taken from contract)
    const finalContractBalance = await instance.balanceOf(await instance.getAddress());
    expect(finalContractBalance).to.be.lt(initialContractBalance);
    
    // Verify the reward amount matches expected calculation
    const rewardRate = await instance.rewardRate();
    const percent = await instance.percent();
    const expectedReward = transferAmount.mul(rewardRate).div(percent);
    
    // Check if contract had enough balance to distribute reward
    if (initialContractBalance >= expectedReward) {
      expect(finalRecipientReward.sub(initialRecipientReward)).to.equal(expectedReward);
      expect(initialContractBalance.sub(finalContractBalance)).to.equal(expectedReward);
    }
  });
});