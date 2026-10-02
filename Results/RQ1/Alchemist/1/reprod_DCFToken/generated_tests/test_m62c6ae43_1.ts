import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant kill test - m62c6ae43", function () {
  it("should detect the deadAmount calculation mutation (division replaced with addition)", async function () {
    const [owner, addr1, liquidityReceiver] = await ethers.getSigners();
    
    // Deploy DCF with required constructor argument
    const DCF = await ethers.getContractFactory("DCF");
    const dcf = await DCF.deploy(liquidityReceiver.address);
    await dcf.waitForDeployment();
    
    // Get the helper contract address
    const helperAddress = await dcf.helperAddress();
    const LiquidityHelper = await ethers.getContractFactory("LiquidityHelper");
    const helper = LiquidityHelper.attach(helperAddress);
    
    // Set CFO to owner for testing
    await dcf.setCaller(owner.address);
    
    // Get the pair address
    const pairAddress = await dcf.pairAddress();
    
    // Whitelist necessary addresses
    await dcf.setWhite(addr1.address, true);
    
    // Transfer some tokens to addr1 for testing
    const transferAmount = ethers.parseEther("10000");
    await dcf.transfer(addr1.address, transferAmount);
    
    // Remove addr1 from whitelist to trigger the selling logic
    await dcf.setWhite(addr1.address, false);
    
    // Get balance of pair before sell
    const pairBalanceBefore = await dcf.balanceOf(pairAddress);
    
    // Perform a sell transaction (to pair address)
    const sellAmount = ethers.parseEther("1000");
    const fee = sellAmount * 5n / 100n;
    const expectedDeadAmount = (sellAmount - fee) / 2n; // Original: (amount - fee) / deadCfg where deadCfg = 2
    
    // Approve and sell
    await dcf.connect(addr1).approve(dcf.target, sellAmount);
    
    // We need to simulate a swap via the router to trigger the swapping flag
    // First, let's check the DCT and USDT addresses
    const USDT = await dcf.USDT();
    const DCT = await dcf.DCT();
    
    // Create a direct transfer to pair to simulate sell
    await dcf.connect(addr1).transfer(pairAddress, sellAmount);
    
    // Get balance of pair after sell
    const pairBalanceAfter = await dcf.balanceOf(pairAddress);
    
    // Calculate actual burned amount
    const actualBurnedAmount = pairBalanceBefore - pairBalanceAfter;
    
    // The original code would burn expectedDeadAmount, the mutant would burn (sellAmount - fee) + 2
    // which equals sellAmount - fee + 2
    const mutantDeadAmount = sellAmount - fee + 2n;
    
    // If the mutant is present, actualBurnedAmount would equal mutantDeadAmount (if it doesn't revert)
    // If original code is present, actualBurnedAmount would equal expectedDeadAmount
    // We expect the original behavior
    expect(actualBurnedAmount).to.equal(expectedDeadAmount);
  });
});