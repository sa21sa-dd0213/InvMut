import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant kill test - mbee16474", function () {
  it("should revert when approving zero address (original behavior), but mutant incorrectly allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy with constructor arguments
    // Need a UniswapV2Router address and a USDToken address
    // For testing purposes, we can use any valid addresses
    const UNISWAP_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; // Mainnet Uniswap V2 Router
    const USD_TOKEN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // USDC

    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(UNISWAP_ROUTER, USD_TOKEN);
    await instance.waitForDeployment();

    // Test: approve with zero address as spender should revert in original
    // The mutant changes the require to check spender == address(0) instead of spender != address(0)
    // So in the mutant, approving a zero address would NOT revert (it would pass the require)
    // But in the original, it SHOULD revert

    // This test will pass on the original (revert occurs) and fail on the mutant (no revert)
    await expect(
      instance.connect(owner).approve(ethers.ZeroAddress, ethers.parseEther("100"))
    ).to.be.revertedWith("ERC20: approve to the zero address");
  });

  it("should succeed when approving a valid non-zero address (original behavior), but mutant incorrectly reverts", async function () {
    const [owner, addr1] = await ethers.getSigners();

    const UNISWAP_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    const USD_TOKEN = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(UNISWAP_ROUTER, USD_TOKEN);
    await instance.waitForDeployment();

    // Test: approve with valid spender should succeed in original
    // In the mutant, this would revert because spender != address(0) fails the mutant's require
    // This test will pass on the original (no revert) and fail on the mutant (revert occurs)
    await expect(
      instance.connect(owner).approve(addr1.address, ethers.parseEther("100"))
    ).to.not.be.reverted;
  });
});