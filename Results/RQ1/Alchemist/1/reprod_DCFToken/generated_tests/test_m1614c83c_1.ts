import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant m1614c83c test", function () {
  it("should execute fee-swapping logic on sell to pair address (to == pairAddress)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy DCF with a liquidity receive address
    const liquidityReceiveAddress = addr1.address;
    const Factory = await ethers.getContractFactory("DCF");
    const dcf = await Factory.deploy(liquidityReceiveAddress);
    await dcf.waitForDeployment();
    
    const dcfAddress = await dcf.getAddress();
    
    // Get the pair address created during deployment
    const pairAddress = await dcf.pairAddress();
    
    // Get the helper contract address
    const helperAddress = await dcf.helperAddress();
    
    // Get the USDT address used in the contract
    const USDT = await dcf.USDT();
    
    // Get the router address
    const router = await dcf.router();
    
    // Create a mock pair contract to simulate USDT balance tracking
    const pairFactory = await ethers.getContractFactory("IUniswapV2Pair");
    
    // Transfer some DCF tokens to addr1 for testing
    const transferAmount = ethers.parseEther("1000");
    await dcf.connect(owner).transfer(addr1.address, transferAmount);
    
    // Get initial USDT balance of helper contract before sell
    const usdtContract = await ethers.getContractAt("IERC20", USDT);
    const initialHelperUsdtBalance = await usdtContract.balanceOf(helperAddress);
    
    // Get initial DCF balance of pair before sell
    const initialPairDcfBalance = await dcf.balanceOf(pairAddress);
    
    // Perform a sell transaction from addr1 to the pair address
    // This should trigger the swapping logic in the original contract
    const sellAmount = ethers.parseEther("100");
    await dcf.connect(addr1).transfer(pairAddress, sellAmount);
    
    // Get final USDT balance of helper contract after sell
    const finalHelperUsdtBalance = await usdtContract.balanceOf(helperAddress);
    
    // Get final DCF balance of pair after sell
    const finalPairDcfBalance = await dcf.balanceOf(pairAddress);
    
    // In the original contract, the swapping logic should execute:
    // - Fee is deducted (5% of sell amount)
    // - Tokens are swapped for USDT
    // - Liquidity is added
    // Therefore, the helper's USDT balance should have increased
    
    // The mutant changes 'to == pairAddress' to 'to != pairAddress'
    // This means the swapping logic would NOT execute on sell to pair
    // but would execute on other transfers instead
    
    // In the original, helper USDT balance should increase
    // In the mutant, helper USDT balance should remain the same (swapping doesn't trigger)
    expect(finalHelperUsdtBalance).to.be.gt(initialHelperUsdtBalance);
    
    // Also verify that the DCF balance of the pair changed (fee was taken)
    // The pair should have received less than the full sell amount due to fee
    const expectedPairReceipt = sellAmount - (sellAmount * 5n / 100n);
    expect(finalPairDcfBalance - initialPairDcfBalance).to.be.lt(sellAmount);
  });
});