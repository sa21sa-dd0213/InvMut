import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant m12095349 - msg.sender == router replaced with true", function () {
  let owner: any, user: any;
  let dcf: any;
  let liquidityHelper: any;
  let usdt: any;
  let router: any;
  let pairAddress: string;
  let helperAddress: string;

  const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";
  const ROUTER_ADDRESS = "0x10ED43C718714eb63d5aA57B78B54704E256024E";

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy DCF with a liquidity receive address
    const DCF = await ethers.getContractFactory("DCF");
    dcf = await DCF.deploy(user.address);
    await dcf.waitForDeployment();

    // Get the helper address from the deployed contract
    helperAddress = await dcf.helperAddress();
    liquidityHelper = await ethers.getContractAt("LiquidityHelper", helperAddress);

    // Get pair address
    pairAddress = await dcf.pairAddress();

    // Get router contract instance
    router = await ethers.getContractAt("IUniswapV2Router02", ROUTER_ADDRESS);

    // Get USDT contract instance
    usdt = await ethers.getContractAt("IERC20", USDT_ADDRESS);

    // Set the CFO to owner for testing
    await dcf.setCaller(owner.address);

    // Whitelist owner and user for easier testing
    await dcf.setWhite(owner.address, true);
    await dcf.setWhite(user.address, true);

    // Transfer some tokens to user for testing
    await dcf.transfer(user.address, ethers.parseEther("1000"));
  });

  it("should revert when selling to pair from non-router address in original, but succeed in mutant", async function () {
    // First, add liquidity so the pair has tokens
    // Approve USDT for router (using the helper's USDT if any, or we can simulate)
    // For this test, we need to ensure there's a balance in the contract to trigger the fee swap

    // Remove user from whitelist to trigger the fee logic
    await dcf.setWhite(user.address, false);

    // Get initial USDT balance of the helper contract
    const initialHelperUsdtBalance = await usdt.balanceOf(helperAddress);

    // User sells tokens directly to the pair (not through the router)
    // This should trigger the sell logic in _transfer
    const sellAmount = ethers.parseEther("100");

    // Check if user has enough balance and approve
    const userBalance = await dcf.balanceOf(user.address);
    expect(userBalance).to.be.gte(sellAmount);

    await dcf.connect(user).transfer(pairAddress, sellAmount);

    // Get final USDT balance of the helper contract
    const finalHelperUsdtBalance = await usdt.balanceOf(helperAddress);

    // In the original code, when msg.sender != router, the swap should NOT happen
    // So the USDT balance should remain the same
    // In the mutant (true), the swap WILL happen, increasing USDT balance
    expect(finalHelperUsdtBalance).to.equal(initialHelperUsdtBalance,
      "USDT balance changed - mutant detected: swap occurred when it shouldn't have");
  });
});