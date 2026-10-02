import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF - Kill mutant ma644991d (sell fee logic disabled)", function () {
  it("should collect fees and add liquidity on sell, but mutant skips this", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy DCF with liquidity receive address
    const DCF = await ethers.getContractFactory("DCF");
    const dcf = await DCF.deploy(addr1.address);
    await dcf.waitForDeployment();

    // Get helper contract
    const helperAddress = await dcf.helperAddress();
    const LiquidityHelper = await ethers.getContractFactory("LiquidityHelper");
    const helper = LiquidityHelper.attach(helperAddress);

    // Set up caller (cfo)
    await dcf.setCaller(owner.address);

    // Get initial balances
    const initialContractBalance = await dcf.balanceOf(dcf.target);

    // Get pair address and transfer some tokens to addr2 for selling
    const pairAddress = await dcf.pairAddress();
    const sellAmount = ethers.parseEther("1000");
    await dcf.transfer(addr2.address, sellAmount);

    // Get contract balance before sell
    const contractBalanceBefore = await dcf.balanceOf(dcf.target);

    // addr2 sells tokens to the pair (triggers fee collection and liquidity)
    await dcf.connect(addr2).transfer(pairAddress, sellAmount);

    // Get contract balance after sell
    const contractBalanceAfter = await dcf.balanceOf(dcf.target);

    // The original should have collected fee (5% of sell amount)
    // The mutant with false condition skips fee collection entirely
    // So we check that contract balance increased
    expect(contractBalanceAfter).to.be.gt(contractBalanceBefore);

    // Additionally, verify that liquidity helper received USDT (from swap)
    // If mutant killed, helper would have no USDT from this sell
    const USDT = "0x55d398326f99059fF775485246999027B3197955";
    const usdtContract = await ethers.getContractAt("IERC20", USDT);
    const helperUsdtBalance = await usdtContract.balanceOf(helperAddress);

    // Original would have swapped fee tokens to USDT and added liquidity
    // Mutant skips this, so helper USDT balance would be 0
    expect(helperUsdtBalance).to.be.gt(0);
  });
});