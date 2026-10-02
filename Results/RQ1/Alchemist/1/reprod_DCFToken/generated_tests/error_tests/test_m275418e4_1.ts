import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant m275418e4 - sell without router", function () {
  it("should revert when selling directly to pair without router (mutant kills)", async function () {
    const [owner, addr1, liquidityReceiver] = await ethers.getSigners();
    
    // Deploy DCF with constructor argument
    const DCF = await ethers.getContractFactory("DCF");
    const dcf = await DCF.deploy(liquidityReceiver.address);
    await dcf.waitForDeployment();
    
    // Get helper and pair addresses
    const helperAddress = await dcf.helperAddress();
    const pairAddress = await dcf.pairAddress();
    
    // Transfer some tokens to addr1 for testing
    const transferAmount = ethers.parseEther("1000");
    await dcf.transfer(addr1.address, transferAmount);
    
    // Verify addr1 has tokens
    expect(await dcf.balanceOf(addr1.address)).to.equal(transferAmount);
    
    // Attempt direct sell to pair (not through router) - this should succeed in original
    // but in mutant the condition msg.sender != router will trigger liquidity logic
    const sellAmount = ethers.parseEther("100");
    await expect(
      dcf.connect(addr1).transfer(pairAddress, sellAmount)
    ).to.not.be.reverted;
    
    // In mutant version, the swapTokensForUSDT and addLiquidity calls will fail
    // because there are no USDT approvals or balances in the helper
    // So the original passes but mutant reverts
  });
});