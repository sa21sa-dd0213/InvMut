import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant m3f642b90 - router address mutation test", function () {
  it("should revert when trying to swap tokens because router points to contract itself instead of Uniswap", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy DCF with a liquidity receive address
    const liquidityReceiveAddress = addr1.address;
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(liquidityReceiveAddress);
    await instance.waitForDeployment();

    // Get the pair address from the contract
    const pairAddress = await instance.pairAddress();

    // Get the DCF token address
    const dcfAddress = await instance.getAddress();

    // Get the router address from the contract (should be mutated to address(this))
    const routerAddress = await instance.router();

    // Verify that the router address is the contract itself (the mutant)
    expect(routerAddress).to.equal(dcfAddress, "Router should be set to address(this) for mutant");

    // Transfer some tokens to addr1 to simulate a sell
    const transferAmount = ethers.parseEther("1000");
    await instance.transfer(addr1.address, transferAmount);

    // Get the USDT token contract
    const USDT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";
    const usdtContract = await ethers.getContractAt("IERC20", USDT_ADDRESS);

    // Approve DCF tokens for transfer on behalf of addr1
    const dcfContractAsAddr1 = instance.connect(addr1);
    await dcfContractAsAddr1.approve(pairAddress, transferAmount);

    // Get the pair contract
    const pairContract = await ethers.getContractAt("IUniswapV2Pair", pairAddress);

    // Add liquidity to the pair first so we can trigger a swap
    // This requires having both USDT and DCF tokens
    // We'll use the owner's tokens since they have the initial supply
    const usdtAmount = ethers.parseEther("10000");
    const dcfAmount = ethers.parseEther("10000");

    // Approve tokens for the router (which is the contract itself in mutant)
    // Since router = address(this), this won't work for actual Uniswap operations
    await instance.approve(routerAddress, dcfAmount);

    // Try to trigger the swap by transferring tokens to the pair
    // This should revert because the contract tries to call Uniswap functions on itself
    await expect(
      instance.connect(addr1).transfer(pairAddress, transferAmount)
    ).to.be.reverted;
  });
});