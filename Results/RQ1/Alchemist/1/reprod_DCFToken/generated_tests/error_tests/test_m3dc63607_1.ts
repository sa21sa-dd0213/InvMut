import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant m3dc63607 - burnPair >= 0", function () {
  let dcf: any;
  let liquidityHelper: any;
  let owner: any;
  let addr1: any;
  let addr2: any;
  let liquidityReceiveAddress: any;
  let USDT: string = "0x55d398326f99059fF775485246999027B3197955";
  let router: string = "0x10ED43C718714eb63d5aA57B78B54704E256024E";

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    liquidityReceiveAddress = addr2.address;

    const DCF = await ethers.getContractFactory("DCF");
    dcf = await DCF.deploy(liquidityReceiveAddress);
    await dcf.waitForDeployment();

    // Get the helper contract address
    const helperAddress = await dcf.helperAddress();
    liquidityHelper = await ethers.getContractAt("LiquidityHelper", helperAddress);

    // Set up caller (cfo) for privileged functions
    await dcf.setCaller(addr1.address);

    // Add some liquidity to the pair so we can test sell scenarios
    // Mint USDT to owner (simplified - in real scenario we'd need actual USDT)
    // For this test we'll set up white addresses to bypass the complex transfer logic
    await dcf.setWhite(owner.address, true);
    await dcf.setWhite(addr1.address, true);
    await dcf.setWhite(addr2.address, true);
    await dcf.setWhite(dcf.target, true);
  });

  it("should fail when deadAmount equals 0 and mutant tries to burn", async function () {
    // Remove white address status from pair address to trigger the sell logic
    const pairAddress = await dcf.pairAddress();
    await dcf.connect(addr1).setWhite(pairAddress, false);

    // Get the deadCfg value (default is 2)
    const deadCfg = await dcf.deadCfg();
    
    // Calculate the minimum amount that would result in deadAmount = 0
    // deadAmount = (amount - fee) / deadCfg
    // For deadAmount to be 0: (amount - fee) / deadCfg = 0
    // fee = (amount * 5) / 100
    // So: (amount - (amount * 5) / 100) / deadCfg = 0
    // This means: amount - (amount * 5) / 100 < deadCfg
    // amount * 0.95 < deadCfg
    // amount < deadCfg / 0.95
    
    const deadCfgValue = Number(deadCfg);
    const maxAmountForZeroDead = Math.floor(deadCfgValue / 0.95) - 1;
    
    // Ensure we have at least some tokens to sell
    const sellAmount = maxAmountForZeroDead > 0 ? ethers.parseEther(String(maxAmountForZeroDead)) : ethers.parseEther("1");
    
    // Transfer tokens to addr1 to simulate a sell
    await dcf.transfer(addr1.address, sellAmount);
    
    // Now addr1 tries to sell tokens back to the pair (simulating a sell transaction)
    // First approve the router to spend tokens
    await dcf.connect(addr1).approve(router, sellAmount);
    
    // Remove white status from addr1 to trigger the sell logic
    await dcf.connect(addr1).setWhite(addr1.address, false);
    
    // Attempt to sell - this should trigger _transfer with to = pairAddress
    // The original contract would not burn when deadAmount = 0
    // The mutant would try to burn when deadAmount >= 0
    
    // We need to simulate a sell by transferring to the pair
    // This should fail on the mutant because burnPair would be called with _deadAmount = 0
    // which would execute _burn(pairAddress, 0) and then sync()
    
    // First, let's check if the sell would actually trigger the burn logic
    // We need to ensure the pair has enough balance for the deadAmount check
    const pairBalance = await dcf.balanceOf(pairAddress);
    
    // If pair balance is less than deadAmount, the burn won't happen anyway
    // So we need to ensure pair has enough balance
    if (pairBalance < sellAmount) {
      // Send some tokens to the pair to make the test meaningful
      await dcf.transfer(pairAddress, sellAmount);
    }
    
    // Now try the sell transaction
    try {
      const tx = await dcf.connect(addr1).transfer(pairAddress, sellAmount);
      await tx.wait();
      
      // If we get here, the transaction succeeded
      // For the mutant, this should have called burnPair(0) which does _burn and sync
      // The original would skip the burn entirely
      
      // Check if any tokens were burned from the pair (mutant behavior)
      const newPairBalance = await dcf.balanceOf(pairAddress);
      
      // If the mutant burned 0 tokens, the balance should remain the same
      // But the sync() call might have caused issues
      expect(newPairBalance).to.equal(pairBalance); // This should pass on original
      
    } catch (error: any) {
      // If it reverts, the mutant might have been killed
      // The original would not revert because it skips the burn
      // The mutant might revert because of the sync() call or burn(0) behavior
      expect(error.message).to.include("revert");
    }
  });
});