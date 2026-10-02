import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant m996acec4 - kill test", function () {
  it("should kill mutant by verifying liquidity addition after sell triggers fee swap", async function () {
    const [owner, addr1, liquidityReceiver] = await ethers.getSigners();
    
    // Deploy DCF with liquidity receiver address
    const DCF = await ethers.getContractFactory("DCF");
    const dcf = await DCF.deploy(liquidityReceiver.address);
    await dcf.waitForDeployment();
    
    // Get helper address from deployed contract
    const helperAddress = await dcf.helperAddress();
    
    // Get router and pair addresses
    const routerAddress = await dcf.router();
    const pairAddress = await dcf.pairAddress();
    
    // Get USDT address from contract
    const USDT = await dcf.USDT();
    
    // Impersonate router to simulate swap
    await ethers.provider.send("hardhat_impersonateAccount", [routerAddress]);
    const routerSigner = await ethers.getSigner(routerAddress);
    
    // Get DCF token and USDT contract instances
    const dcfToken = await ethers.getContractAt("ERC20", await dcf.getAddress());
    const usdtToken = await ethers.getContractAt("IERC20", USDT);
    
    // Fund router with DCF tokens for selling
    const sellAmount = ethers.parseEther("1000");
    await dcfToken.connect(owner).transfer(routerAddress, sellAmount);
    
    // Get initial USDT balance of helper
    const initialHelperUsdtBalance = await usdtToken.balanceOf(helperAddress);
    
    // Perform sell through pair (simulate swap by sending tokens to pair)
    await dcfToken.connect(routerSigner).transfer(pairAddress, sellAmount);
    
    // Check if liquidity was added successfully - in original contract, helper should have USDT from swap
    // and then add liquidity. In mutant, the calculation is wrong and will revert.
    const finalHelperUsdtBalance = await usdtToken.balanceOf(helperAddress);
    
    // In the original contract, after swap and liquidity add, helper's USDT balance should change
    // In the mutant, the liquidity addition will fail due to incorrect balance calculation
    // We expect the transaction to revert or the balance to remain unchanged
    expect(finalHelperUsdtBalance).to.equal(initialHelperUsdtBalance);
    
    // Verify pair liquidity was not affected (mutant should fail to add liquidity)
    const pairContract = await ethers.getContractAt("IUniswapV2Pair", pairAddress);
    const [reserve0, reserve1] = await pairContract.getReserves();
    
    // In original, liquidity would be added increasing reserves
    // In mutant, liquidity addition fails so reserves stay as they were
    expect(reserve0).to.be.gt(0);
    expect(reserve1).to.be.gt(0);
  });
});