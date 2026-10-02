import { expect } from "chai";
import { ethers } from "hardhat";

describe("Kill mutant m155ecd67 - USDT address replaced with router address", function () {
  it("should revert when trying to swap tokens for USDT due to invalid USDT address", async function () {
    const [owner, addr1, liquidityReceive] = await ethers.getSigners();
    
    // Deploy DCF with required constructor argument (liquidityReceiveAddress)
    const Factory = await ethers.getContractFactory("DCF");
    const dcf = await Factory.deploy(liquidityReceive.address);
    await dcf.waitForDeployment();
    
    const dcfAddress = await dcf.getAddress();
    
    // Get the helper contract address from DCF
    const helperAddress = await dcf.helperAddress();
    const helperFactory = await ethers.getContractFactory("LiquidityHelper");
    const helper = helperFactory.attach(helperAddress);
    
    // Get the router address from DCF
    const routerAddress = await dcf.router();
    
    // Get the USDT address from DCF (mutated to router address)
    const usdtAddress = await dcf.USDT();
    
    // Verify that USDT is set to the router address (the mutant)
    expect(usdtAddress).to.equal(routerAddress);
    
    // Get the pair address
    const pairAddress = await dcf.pairAddress();
    
    // Transfer some DCF tokens to addr1 for testing
    const transferAmount = ethers.parseEther("1000");
    await dcf.transfer(addr1.address, transferAmount);
    
    // Get DCF token balance of addr1
    const balanceBefore = await dcf.balanceOf(addr1.address);
    expect(balanceBefore).to.equal(transferAmount);
    
    // Set white address for addr1 to bypass whiteAddress checks
    // First we need to set the caller (cfo) to owner
    await dcf.setCaller(owner.address);
    
    // Add addr1 to white list to avoid restrictions
    await dcf.setWhite(addr1.address, true);
    
    // Now try to trigger a transfer that would call swapTokensForUSDT
    // This requires selling tokens on the pair (to == pairAddress)
    // First, we need to simulate a sell to pairAddress
    // But the mutant makes USDT = router, so swapTokensForUSDT will fail
    
    // Approve DCF tokens for transfer
    await dcf.connect(addr1).approve(routerAddress, transferAmount);
    
    // Attempt to transfer tokens to the pair address to trigger the swap logic
    // This should revert because USDT address is invalid (router instead of actual USDT)
    await expect(
      dcf.connect(addr1).transfer(pairAddress, ethers.parseEther("100"))
    ).to.be.reverted;
    
    // Also test the addLiquidity function directly via helper
    // First we need to fund the helper with some tokens
    // The helper should have USDT tokens for addLiquidity to work
    // Since USDT is mutated to router address, any USDT operations will fail
    
    // Try to call addLiquidity on helper with some USDT amount
    // This should revert because the USDT address is actually the router contract
    await expect(
      helper.connect(owner).addLiquidity(ethers.parseEther("1000"))
    ).to.be.reverted;
  });
});