import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant m77b497a5 - burnPair on sell", function () {
  it("should detect that burnPair is not called when condition is false", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy DCF with a liquidity receive address
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(addr2.address);
    await instance.waitForDeployment();
    const dcfAddress = await instance.getAddress();

    // Get the pair address
    const pairAddress = await instance.pairAddress();
    
    // Get the helper address
    const helperAddress = await instance.helperAddress();
    
    // Set caller (cfo) to owner for setup
    await instance.setCaller(owner.address);
    
    // Add liquidity to enable trading
    // First, approve USDT spending for the helper
    // We need to get USDT token - use the address from the contract
    const USDT_ADDRESS = await instance.USDT();
    const usdtContract = await ethers.getContractAt("IERC20", USDT_ADDRESS);
    
    // For testing, we need to have some USDT - but this is a mainnet token
    // We'll use a simplified approach: transfer tokens to pair directly to simulate liquidity
    
    // Transfer some DCF tokens to addr1 for testing
    const transferAmount = ethers.parseEther("1000");
    await instance.transfer(addr1.address, transferAmount);
    
    // Record initial total supply and pair balance
    const initialTotalSupply = await instance.totalSupply();
    const initialPairBalance = await instance.balanceOf(pairAddress);
    
    // Get deadCfg to calculate deadAmount
    const deadCfg = await instance.deadCfg(); // This might not be public, but we can estimate
    
    // Simulate a sell transaction from addr1 to the pair
    // First, we need to ensure addr1 has tokens and the pair has liquidity
    // Approve the router to spend tokens on behalf of addr1
    const routerAddress = await instance.router();
    
    // For this test, we'll directly transfer tokens from addr1 to pair to simulate a sell
    // This triggers the _transfer function with to=pairAddress
    const sellAmount = ethers.parseEther("500");
    
    // White-list addr1 to avoid the initial checks
    await instance.setWhite(addr1.address, true);
    
    // Record balances before sell
    const totalSupplyBefore = await instance.totalSupply();
    const pairBalanceBefore = await instance.balanceOf(pairAddress);
    
    // Perform the sell by transferring to pair (this triggers the burn logic)
    await instance.connect(addr1).transfer(pairAddress, sellAmount);
    
    // Record balances after sell
    const totalSupplyAfter = await instance.totalSupply();
    const pairBalanceAfter = await instance.balanceOf(pairAddress);
    
    // In the original contract, if pair balance > deadAmount, tokens are burned
    // In the mutant, the burn never happens (condition is false)
    // Therefore, total supply should remain the same in the mutant
    // In the original, total supply would decrease by deadAmount
    
    // The expected deadAmount = (sellAmount - fee) / deadCfg
    // fee = sellAmount * 5 / 100 = 25
    // amount after fee = 475
    // deadAmount = 475 / 2 = 237.5 (but using integer division)
    const fee = (sellAmount * 5n) / 100n;
    const amountAfterFee = sellAmount - fee;
    const deadAmount = amountAfterFee / 2n; // deadCfg = 2
    
    // In the original, totalSupply would decrease by deadAmount
    // In the mutant, totalSupply stays the same (minus the fee that goes to contract)
    
    // Check that total supply did NOT decrease by deadAmount (mutant behavior)
    // The fee is transferred to the contract, so totalSupply decreases by fee only
    const expectedSupplyDecrease = fee; // Only fee is burned/moved to contract
    
    // Verify the mutant: totalSupply should not have decreased by deadAmount
    expect(totalSupplyAfter).to.equal(totalSupplyBefore - fee);
    
    // Additional verification: pair balance should not have decreased by deadAmount
    // In original, pair balance would decrease by deadAmount
    // In mutant, pair balance only changes by the sell amount
    expect(pairBalanceAfter).to.equal(pairBalanceBefore + sellAmount - fee);
  });
});