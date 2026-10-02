import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant m9c7d8619 test", function () {
  it("should NOT burn when pair balance exactly equals deadAmount (kills >= mutant)", async function () {
    const [owner, addr1, addr2, liquidityReceiver] = await ethers.getSigners();
    
    // Deploy DCF with liquidity receiver address
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(liquidityReceiver.address);
    await instance.waitForDeployment();
    
    // Get helper contract address
    const helperAddress = await instance.helperAddress();
    const helperFactory = await ethers.getContractFactory("LiquidityHelper");
    const helper = helperFactory.attach(helperAddress);
    
    // Get router and USDT addresses from contract
    const routerAddress = await instance.router();
    const usdtAddress = await instance.USDT();
    
    // Get pair address
    const pairAddress = await instance.pairAddress();
    
    // Get the USDT contract
    const usdtFactory = await ethers.getContractFactory("IERC20");
    const usdt = usdtFactory.attach(usdtAddress);
    
    // Get the pair contract
    const pairFactory = await ethers.getContractFactory("IUniswapV2Pair");
    const pair = pairFactory.attach(pairAddress);
    
    // Setup: Transfer some tokens to the pair to simulate initial liquidity
    const initialSupply = ethers.parseEther("2000000");
    const pairInitialBalance = ethers.parseEther("1000");
    await instance.transfer(pairAddress, pairInitialBalance);
    
    // Calculate deadAmount based on contract logic: deadCfg = 2
    // deadAmount = (amount - fee) / deadCfg where fee = amount * 5 / 100
    // We want pairBalance to exactly equal deadAmount
    // deadAmount = (amount - amount*5/100) / 2 = (amount * 0.95) / 2
    // If we want pairBalance = deadAmount, we need to find amount such that:
    // pairBalance = (amount * 0.95) / 2
    // amount = (pairBalance * 2) / 0.95
    
    const pairBalance = await instance.balanceOf(pairAddress);
    
    // Calculate amount such that deadAmount equals current pair balance
    // deadAmount = (amount - fee) / 2 where fee = amount * 5/100
    // deadAmount = (amount * 95/100) / 2 = amount * 95/200
    // amount = deadAmount * 200/95
    const amount = pairBalance * 200n / 95n;
    
    // Calculate what deadAmount would be for a given amount
    // deadAmount = (amount - amount * 5/100) / 2
    const fee = (amount * 5n) / 100n;
    const deadAmount = (amount - fee) / 2n;
    
    // Transfer tokens to pair so pairBalance equals deadAmount
    const currentPairBalance = await instance.balanceOf(pairAddress);
    if (currentPairBalance < deadAmount) {
      const transferAmount = deadAmount - currentPairBalance;
      await instance.transfer(pairAddress, transferAmount);
    } else if (currentPairBalance > deadAmount) {
      // This shouldn't happen if we calculated correctly
      // We'll adjust the test by reducing pair balance (not possible directly)
      // Instead, recalculate with current balance
      // For this test, we'll just ensure we use the exact deadAmount
    }
    
    const pairBalanceAfterSetup = await instance.balanceOf(pairAddress);
    expect(pairBalanceAfterSetup).to.equal(deadAmount);
    
    // Now perform the transfer that triggers the burn check
    // We need to do a sell to pair (to == pairAddress)
    // But we need swapping = false and from != pairAddress
    // And to == pairAddress to trigger the selling logic
    
    // Transfer from owner (not pair) to pair
    await instance.transfer(pairAddress, amount);
    
    // Check if pair balance was burned or not
    const pairBalanceAfterTransfer = await instance.balanceOf(pairAddress);
    
    // In the original (with >), the balance should remain the same plus the amount transferred
    // because burn won't happen when pairBalance == deadAmount
    // In the mutant (with >=), the balance would decrease because burn happens
    
    // The expected behavior for original: pairBalance = pairBalanceAfterSetup + amount - (if burn happens then deadAmount else 0)
    // Since we're testing the case where pairBalance == deadAmount, original doesn't burn, mutant does
    
    // If the mutant is present, the pair balance will be lower because burn happened
    // Let's verify the pair balance is what we expect for the original behavior
    const expectedBalance = pairBalanceAfterSetup + amount; // No burn in original
    expect(pairBalanceAfterTransfer).to.equal(expectedBalance);
  });
});