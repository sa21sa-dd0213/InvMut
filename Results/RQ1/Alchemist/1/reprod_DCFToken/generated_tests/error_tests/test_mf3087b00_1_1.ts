import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant kill test - mf3087b00", function () {
  it("should not burn tokens from pair when pair balance is less than or equal to deadAmount", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy DCF with a liquidity receive address
    const liquidityReceiveAddress = addr2.address;
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(liquidityReceiveAddress);
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();
    
    // Get the pair address and router from the contract
    const pairAddress = await instance.pairAddress();
    const routerAddress = await instance.router();
    
    // Get USDT address from the contract
    const USDT = await instance.USDT();
    
    // Get the DCF token contract interface for USDT
    const USDTContract = await ethers.getContractAt("IERC20", USDT);
    
    // Transfer some DCF tokens to addr1 for testing
    const transferAmount = ethers.parseEther("1000");
    await instance.connect(owner).transfer(addr1.address, transferAmount);
    
    // Set up the pair with initial liquidity to make it functional
    // First, approve router to spend tokens
    const approveAmount = ethers.parseEther("100000");
    await instance.connect(owner).approve(routerAddress, approveAmount);
    
    // Get router contract
    const routerContract = await ethers.getContractAt("IUniswapV2Router02", routerAddress);
    
    // Add some initial liquidity to the pair so it exists and has some balance
    const usdtAmount = ethers.parseEther("1000");
    const dcfAmount = ethers.parseEther("1000");
    
    // We need USDT tokens to add liquidity - for testing purposes we'll use the helper
    // First, let's check the current pair balance
    const pairContract = await ethers.getContractAt("IUniswapV2Pair", pairAddress);
    const initialPairBalance = await instance.balanceOf(pairAddress);
    
    // Set deadCfg to a value that makes deadAmount larger than current pair balance
    // deadCfg = 2 initially, so deadAmount = (amount - fee) / 2
    // We need to ensure pair balance is <= deadAmount after a sell
    
    // First, set the cfo (caller) to owner
    await instance.connect(owner).setCaller(owner.address);
    
    // Set deadCfg to a very high value so deadAmount is very small
    // This way the condition balanceOf(pairAddress) > deadAmount is more likely false
    await instance.connect(owner).setCfg(1000);
    
    // Now perform a sell transaction that triggers the _transfer with swapping logic
    // We need to sell to the pair address while not being whitelisted
    // Remove addr1 from whitelist first
    await instance.connect(owner).setWhite(addr1.address, false);
    
    // Get the current pair balance before the sell
    const pairBalanceBefore = await instance.balanceOf(pairAddress);
    
    // Calculate what deadAmount would be for a sell of 100 tokens
    // fee = (100 * 5) / 100 = 5
    // deadAmount = (100 - 5) / 1000 = 0 (since deadCfg = 1000)
    // So pairBalanceBefore (which is > 0 if we added liquidity) > 0 is true
    // But we want to test when pairBalance <= deadAmount
    // Let's make the sell amount very small so deadAmount is 0
    const sellAmount = ethers.parseEther("0.001"); // Very small amount
    // fee = (0.001 * 5) / 100 = 0.00005
    // deadAmount = (0.001 - 0.00005) / 1000 = 0.00000095
    // If pair balance is 0 (no liquidity added yet), then 0 > 0.00000095 is false
    
    // Approve router to spend tokens from addr1
    await instance.connect(addr1).approve(routerAddress, sellAmount);
    
    // Sell tokens to the pair via the router
    // This will trigger the _transfer from addr1 to pairAddress
    await instance.connect(addr1).transfer(pairAddress, sellAmount);
    
    // Check that no tokens were burned from the pair
    const pairBalanceAfter = await instance.balanceOf(pairAddress);
    
    // If the mutant is present (condition is always true), it would have called burnPair
    // which would have reduced the pair balance
    // If original code (condition checks balance > deadAmount), it would NOT have burned
    // Since we designed the test so pairBalance <= deadAmount, original should not burn
    // So pairBalanceAfter should be greater than or equal to pairBalanceBefore (minus the transfer amount)
    // In the mutant, burnPair would reduce it further
    
    // The transfer itself adds the sell amount to the pair
    // If no burn happened: pairBalanceAfter = pairBalanceBefore + sellAmount - fee (which goes to contract)
    // The fee is transferred to the contract, not burned from pair
    // So pair balance should increase by (sellAmount - fee)
    const fee = sellAmount * 5n / 100n;
    const expectedPairIncrease = sellAmount - fee;
    
    // If no burn occurred (original behavior):
    expect(pairBalanceAfter).to.equal(pairBalanceBefore + expectedPairIncrease);
    
    // If burn occurred (mutant behavior), pairBalanceAfter would be less than expected
    // This assertion will fail on the mutant, killing it
  });
});