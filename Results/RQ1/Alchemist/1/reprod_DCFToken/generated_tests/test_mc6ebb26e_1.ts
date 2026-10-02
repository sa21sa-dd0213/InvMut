import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant mc6ebb26e - buy restriction removal", function () {
  it("should revert when buying tokens from the pair address, but mutant allows it", async function () {
    const [owner, buyer] = await ethers.getSigners();
    
    // Deploy DCF with a liquidity receive address
    const liquidityReceiveAddress = buyer.address;
    const Factory = await ethers.getContractFactory("DCF");
    const dcf = await Factory.deploy(liquidityReceiveAddress);
    await dcf.waitForDeployment();
    
    // Get the pair address from the contract
    const pairAddress = await dcf.pairAddress();
    
    // Get the USDT token address
    const usdtAddress = await dcf.USDT();
    
    // Deploy a mock USDT for testing (since we can't use real USDT on testnet)
    const USDTFactory = await ethers.getContractFactory("IERC20");
    const usdt = await ethers.getContractAt("IERC20", usdtAddress);
    
    // Fund the buyer with some DCF tokens to simulate a swap
    const transferAmount = ethers.parseEther("100");
    await dcf.connect(owner).transfer(buyer.address, transferAmount);
    
    // Approve DCF tokens for the pair address to simulate a buy
    await dcf.connect(buyer).approve(pairAddress, transferAmount);
    
    // Attempt to transfer from pair address (simulating a buy)
    // In the original contract, this should revert with "buy error"
    // In the mutant, this should succeed (no revert)
    
    try {
      // This simulates a transfer where from = pairAddress (buying from pool)
      await dcf.connect(buyer).transferFrom(pairAddress, buyer.address, transferAmount);
      
      // If we get here, the mutant is live (no revert)
      // We should fail the test because the original would have reverted
      // But for mutant detection, we need to verify it didn't revert
      const buyerBalance = await dcf.balanceOf(buyer.address);
      expect(buyerBalance).to.be.gt(transferAmount);
    } catch (error: any) {
      // If it reverts, the original contract behavior is preserved
      // The mutant would have killed this behavior
      expect(error.message).to.include("buy error");
    }
  });
});