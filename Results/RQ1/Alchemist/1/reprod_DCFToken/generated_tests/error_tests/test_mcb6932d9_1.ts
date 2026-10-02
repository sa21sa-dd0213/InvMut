import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant mcb6932d9 - deadAmount calculation", function () {
  let dcf: any;
  let liquidityHelper: any;
  let owner: any;
  let addr1: any;
  let addr2: any;
  let USDT: any;
  let router: any;
  let pairAddress: string;
  const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";
  const ROUTER_ADDRESS = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
  const liquidityReceiveAddress = "0x0000000000000000000000000000000000000001";

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy DCF with constructor argument
    const DCF = await ethers.getContractFactory("DCF");
    dcf = await DCF.deploy(liquidityReceiveAddress);
    await dcf.waitForDeployment();
    
    // Get helper address
    const helperAddress = await dcf.helperAddress();
    const LiquidityHelper = await ethers.getContractFactory("LiquidityHelper");
    liquidityHelper = LiquidityHelper.attach(helperAddress);
    
    // Set CFO
    await dcf.setCaller(owner.address);
    
    // Add white addresses for testing
    await dcf.setWhite(addr1.address, true);
    await dcf.setWhite(addr2.address, true);
    
    // Get router and pair
    router = await ethers.getContractAt("IUniswapV2Router02", ROUTER_ADDRESS);
    pairAddress = await dcf.pairAddress();
    
    // Get USDT contract
    USDT = await ethers.getContractAt("IERC20", USDT_ADDRESS);
    
    // Transfer some DCF to addr1 for testing
    const transferAmount = ethers.parseEther("10000");
    await dcf.transfer(addr1.address, transferAmount);
    
    // Setup: Transfer some tokens to pair to enable selling
    await dcf.transfer(pairAddress, ethers.parseEther("5000"));
  });

  it("should correctly calculate deadAmount when selling tokens", async function () {
    // Get initial pair balance
    const initialPairBalance = await dcf.balanceOf(pairAddress);
    
    // Set deadCfg to 2 for predictable calculation
    await dcf.setCfg(2);
    
    // Amount to sell
    const sellAmount = ethers.parseEther("1000");
    
    // Calculate expected deadAmount in original: (amount - fee) / deadCfg
    // fee = amount * 5 / 100 = 1000 * 5 / 100 = 50
    // deadAmount = (1000 - 50) / 2 = 475
    const fee = sellAmount * 5n / 100n;
    const expectedDeadAmount = (sellAmount - fee) / 2n;
    
    // Get the pair address to track burned tokens
    const pairContract = await ethers.getContractAt("IUniswapV2Pair", pairAddress);
    
    // Perform a sell transaction by sending tokens to pair address
    // This triggers the _transfer function with to == pairAddress
    await dcf.connect(addr1).transfer(pairAddress, sellAmount);
    
    // Get final pair balance
    const finalPairBalance = await dcf.balanceOf(pairAddress);
    
    // Calculate actual tokens burned (the difference between expected transfer and actual balance)
    // When selling, fee is taken first, then deadAmount is burned from pair
    // The amount transferred to pair = sellAmount - fee
    // Then deadAmount is burned from pair
    // So pair balance should increase by (sellAmount - fee - deadAmount)
    const expectedIncrease = sellAmount - fee - expectedDeadAmount;
    const actualIncrease = finalPairBalance - initialPairBalance;
    
    // If mutant is active, deadAmount = (amount / fee) / deadCfg = (1000 / 50) / 2 = 10
    // Expected increase would be: 1000 - 50 - 10 = 940
    // But original expected increase is: 1000 - 50 - 475 = 475
    
    // The test should fail on mutant because the deadAmount calculation is wrong
    expect(actualIncrease).to.equal(expectedIncrease);
  });
});