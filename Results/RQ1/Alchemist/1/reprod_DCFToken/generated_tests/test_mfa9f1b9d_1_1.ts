import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant kill test - mfa9f1b9d", function () {
  it("should revert when trying to add liquidity via swap due to USDT being address(0)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy DCF with a liquidity receive address
    const liquidityReceiveAddress = addr1.address;
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(liquidityReceiveAddress);
    await instance.waitForDeployment();

    // Get the helper contract address
    const helperAddress = await instance.helperAddress();
    const LiquidityHelper = await ethers.getContractFactory("LiquidityHelper");
    const helper = LiquidityHelper.attach(helperAddress);

    // Get the token address
    const tokenAddress = await instance.getAddress();

    // Check that USDT is address(0) in the mutant
    const usdtAddress = await instance.USDT();
    expect(usdtAddress).to.equal(ethers.ZeroAddress);

    // Try to call addLiquidity on the helper - this should revert because
    // the USDT address is zero and cannot be interacted with
    // First need to set the caller as owner of helper (which is DCF contract)
    // The owner of DCF can call setCaller to set the CFO
    await instance.setCaller(owner.address);

    // Try to trigger a swap that uses USDT - this will revert
    // We need to transfer some tokens to the contract to trigger the swap logic
    // First, get some tokens from the owner
    const ownerBalance = await instance.balanceOf(owner.address);

    // Transfer tokens to trigger the swap mechanism
    // The swap happens when selling to the pair, but we need to set up the pair first
    const pairAddress = await instance.pairAddress();

    // Approve tokens for transfer
    await instance.approve(owner.address, ethers.parseEther("1000"));

    // Transfer tokens to the contract to enable swapping
    await instance.transfer(await instance.getAddress(), ethers.parseEther("1000"));

    // Now try to call the helper's addLiquidity directly - should revert
    // because USDT is address(0) and approve/swap will fail
    await expect(
      helper.addLiquidity(ethers.parseEther("1000"))
    ).to.be.reverted;

    // Also verify that swapping tokens for USDT would fail
    // by checking the swapTokensForUSDT path through the transfer function
    // First, set up the pair with some liquidity to make the transfer path work
    // The transfer to pairAddress with selling logic will trigger swapTokensForUSDT

    // Try transferring to the pair address - should revert due to USDT being zero
    await expect(
      instance.connect(owner).transfer(pairAddress, ethers.parseEther("100"))
    ).to.be.reverted;
  });
});