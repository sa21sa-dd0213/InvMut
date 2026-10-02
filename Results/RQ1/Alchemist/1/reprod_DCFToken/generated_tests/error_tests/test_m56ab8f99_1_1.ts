import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant kill test - m56ab8f99", function () {
  it("should execute liquidity addition when selling tokens via router", async function () {
    const [owner, addr1, liquidityReceiver] = await ethers.getSigners();
    
    // Deploy DCF with liquidity receive address
    const DCF = await ethers.getContractFactory("DCF");
    const dcf = await DCF.deploy(liquidityReceiver.address);
    await dcf.waitForDeployment();
    
    // Get helper address
    const helperAddress = await dcf.helperAddress();
    
    // Get pair address
    const pairAddress = await dcf.pairAddress();
    
    // Get USDT address from contract
    const USDT = await dcf.USDT();
    
    // Get router address from contract
    const router = await dcf.router();
    
    // Get USDT contract instance
    const usdtContract = await ethers.getContractAt("IERC20", USDT);
    
    // Get initial USDT balance of helper contract
    const initialUsdtBalance = await usdtContract.balanceOf(helperAddress);
    
    // Transfer some DCF tokens to owner for selling
    const initialSupply = ethers.parseEther("2000000");
    const sellAmount = ethers.parseEther("1000");
    
    // Approve router to spend tokens
    await dcf.approve(router, sellAmount);
    
    // Create swap path: DCF -> USDT
    const path = [await dcf.getAddress(), USDT];
    
    // Get router contract instance
    const routerContract = await ethers.getContractAt("IUniswapV2Router02", router);
    
    // Perform swapExactTokensForTokensSupportingFeeOnTransferTokens
    // This simulates selling tokens via the router to the pair
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    
    // Need to get the expected amount out first (approximate)
    const amounts = await routerContract.getAmountsOut(sellAmount, path);
    const minAmountOut = amounts[1];
    
    // Execute the swap
    await routerContract.swapExactTokensForTokensSupportingFeeOnTransferTokens(
      sellAmount,
      minAmountOut,
      path,
      owner.address,
      deadline
    );
    
    // Check if liquidity was added by comparing USDT balance of helper
    const finalUsdtBalance = await usdtContract.balanceOf(helperAddress);
    
    // In the original contract, the swap should trigger liquidity addition
    // In the mutant (false condition), liquidity addition is skipped
    // So if USDT balance increased, liquidity was added (original behavior)
    // If not, the mutant is detected
    expect(finalUsdtBalance).to.be.gt(initialUsdtBalance);
  });
});