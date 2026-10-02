import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant m244ceb6f - burnPair", function () {
  it("should kill the mutant by verifying that burnPair actually burns tokens when deadAmount > 0", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy DCF with a liquidity receive address
    const liquidityReceiveAddress = addr1.address;
    const Factory = await ethers.getContractFactory("DCF");
    const dcf = await Factory.deploy(liquidityReceiveAddress);
    await dcf.waitForDeployment();
    
    // Get the helper address and pair address
    const helperAddress = await dcf.helperAddress();
    const pairAddress = await dcf.pairAddress();
    
    // Set the CFO (caller) to owner for setting up
    await dcf.setCaller(owner.address);
    
    // Add owner to white list to avoid fee on transfers during setup
    await dcf.setWhite(owner.address, true);
    
    // Transfer some tokens to the pair address to simulate liquidity
    const amountToPair = ethers.parseEther("1000");
    await dcf.transfer(pairAddress, amountToPair);
    
    // Get pair balance before burn
    const pairBalanceBefore = await dcf.balanceOf(pairAddress);
    
    // The burnPair function is called internally during sells with fee > 0
    // We can trigger it by calling the internal transfer logic
    // First, remove owner from white list to trigger fee logic
    await dcf.setWhite(owner.address, false);
    
    // Transfer tokens to pair (simulating a sell)
    const sellAmount = ethers.parseEther("100");
    await dcf.transfer(pairAddress, sellAmount);
    
    // Get pair balance after the transfer
    const pairBalanceAfter = await dcf.balanceOf(pairAddress);
    
    // In the original contract, burnPair should reduce the pair's balance
    // In the mutant, burnPair never executes because _deadAmount < 0 is always false for uint256
    // Therefore, the pair balance should be lower in the original but NOT lower in the mutant
    
    // If the mutant is present, the pair balance after the transfer will be higher
    // (since tokens were transferred but none were burned)
    // If the original is present, some tokens should have been burned
    
    // We can verify by checking that the pair balance is different than expected
    // For the original: pairBalanceAfter should be less than pairBalanceBefore + sellAmount
    // For the mutant: pairBalanceAfter should equal pairBalanceBefore + sellAmount (no burn)
    
    // This test will pass on the original (balance decreases due to burn)
    // and fail on the mutant (balance stays the same, no burn occurs)
    expect(pairBalanceAfter).to.be.lessThan(pairBalanceBefore + sellAmount);
  });
});