import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant kill test - burnPair", function () {
  it("should kill mutant m4cb753d3 by verifying that tokens are burned from pair address during sell", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy DCF with a liquidity receive address
    const liquidityReceiveAddress = addr2.address;
    const Factory = await ethers.getContractFactory("DCF");
    const dcf = await Factory.deploy(liquidityReceiveAddress);
    await dcf.waitForDeployment();

    // Get helper contract address
    const helperAddress = await dcf.helperAddress();

    // Get router and pair addresses
    const router = await dcf.uniswapV2Router();
    const pairAddress = await dcf.pairAddress();

    // Get USDT address from contract
    const usdtAddress = await dcf.USDT();

    // Get initial total supply
    const initialTotalSupply = await dcf.totalSupply();

    // Setup: Transfer some DCF tokens to addr1 for testing
    const transferAmount = ethers.parseEther("1000");
    await dcf.transfer(addr1.address, transferAmount);

    // Get initial pair balance
    const initialPairBalance = await dcf.balanceOf(pairAddress);

    // We need to have tokens in the pair for the balance check
    // Transfer some tokens to pair first to simulate initial liquidity
    await dcf.transfer(pairAddress, ethers.parseEther("1000"));

    // Now perform the sell transaction from addr1
    const sellAmount = ethers.parseEther("100");
    await dcf.connect(addr1).approve(router, sellAmount);

    // First set a distribute address and set caller
    await dcf.setCaller(owner.address);
    await dcf.setDistributeAddress(addr2.address);

    // Get supply before sell
    const supplyBeforeSell = await dcf.totalSupply();

    // Now trigger a sell to pair through a direct transfer (simulating swap)
    await dcf.connect(addr1).transfer(pairAddress, sellAmount);

    // Get supply after the sell (which should have triggered burn)
    const supplyAfterSell = await dcf.totalSupply();

    // The mutant will NOT burn tokens, so supply will remain the same
    // The original would burn expectedDeadAmount from the pair
    const supplyDifference = supplyBeforeSell - supplyAfterSell;

    // In the original, supplyDifference should be positive (tokens were burned)
    // In the mutant, supplyDifference should be 0 (no burn happened)
    // We expect the mutant to fail this assertion
    expect(supplyDifference).to.be.gt(0);

    // Additional verification: check pair balance decreased by burn amount
    const fee = sellAmount * 5n / 100n;
    const expectedDeadAmount = (sellAmount - fee) / 2n;
    const pairBalanceAfter = await dcf.balanceOf(pairAddress);
    const expectedPairBalance = initialPairBalance + sellAmount - fee - expectedDeadAmount;

    // In original: pairBalanceAfter should equal expectedPairBalance
    // In mutant: pairBalanceAfter will be higher (no burn happened)
    expect(pairBalanceAfter).to.equal(expectedPairBalance);
  });
});