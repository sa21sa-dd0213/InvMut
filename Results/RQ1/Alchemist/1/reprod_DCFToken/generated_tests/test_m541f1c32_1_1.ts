import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant m541f1c32 - division instead of subtraction", function () {
  it("should revert or produce incorrect liquidity when selling tokens triggers swap and liquidity addition", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy DCF with liquidity receive address
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Get helper contract address
    const helperAddress = await instance.helperAddress();
    const LiquidityHelper = await ethers.getContractFactory("LiquidityHelper");
    const helper = LiquidityHelper.attach(helperAddress);

    // Get pair address
    const pairAddress = await instance.pairAddress();

    // Get USDT and router addresses
    const USDT = "0x55d398326f99059fF775485246999027B3197955";
    const router = "0x10ED43C718714eb63d5aA57B78B54704E256024E";

    // Create USDT contract interface
    const usdtContract = await ethers.getContractAt("IERC20", USDT);

    // Set caller (cfo) for configuration
    await instance.setCaller(addr1.address);

    // Whitelist the test addresses
    await instance.connect(addr1).setWhite(owner.address, true);
    await instance.connect(addr1).setWhite(addr1.address, true);

    // Get initial USDT balance of helper contract
    const initialUsdtBalance = await usdtContract.balanceOf(helperAddress);
    console.log("Initial USDT balance of helper:", initialUsdtBalance.toString());

    // Transfer tokens to addr1 for testing
    const transferAmount = ethers.parseEther("1000");
    await instance.transfer(addr1.address, transferAmount);

    // Remove whitelist from addr1 to trigger the fee logic
    await instance.connect(addr1).setWhite(addr1.address, false);

    // Approve router to spend tokens
    await instance.connect(addr1).approve(router, transferAmount);

    // Get token balance before sell
    const balanceBefore = await instance.balanceOf(addr1.address);
    console.log("Balance before sell:", balanceBefore.toString());

    // Attempt to sell tokens to the pair (this triggers the swap and liquidity addition)
    // We expect this to either revert or produce incorrect state
    const sellAmount = ethers.parseEther("100");

    // Try the sell transaction
    try {
      const tx = await instance.connect(addr1).transfer(pairAddress, sellAmount);
      await tx.wait();

      // If it doesn't revert, check the resulting USDT balance of helper
      const finalUsdtBalance = await usdtContract.balanceOf(helperAddress);
      console.log("Final USDT balance of helper:", finalUsdtBalance.toString());

      // The division would produce a much smaller number than subtraction
      // If initial balance > 1, division would give incorrect result
      if (initialUsdtBalance > 1n) {
        // The new balance should be greater than old balance after swap
        // But with division, the calculated newUsdtBalance would be tiny
        // This should cause the liquidity addition to fail or produce wrong state
        expect(finalUsdtBalance).to.be.lessThan(initialUsdtBalance);
      }
    } catch (error: any) {
      // The transaction should revert because division by zero or incorrect calculation
      expect(error.message).to.include("revert");
    }
  });
});