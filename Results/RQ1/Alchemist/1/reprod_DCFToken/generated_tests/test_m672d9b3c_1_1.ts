import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant detection - m672d9b3c", function () {
  it("should revert on small sell amount due to arithmetic underflow in mutant fee calculation", async function () {
    const [owner, liquidityReceiver, cfo] = await ethers.getSigners();
    
    // Deploy DCF with required constructor argument (liquidity receive address)
    const DCF = await ethers.getContractFactory("DCF");
    const dcf = await DCF.deploy(liquidityReceiver.address);
    await dcf.waitForDeployment();
    
    // Set the caller (cfo) to allow setting up white/black lists
    await dcf.setCaller(cfo.address);
    
    // Add liquidity receiver to white list to avoid issues during setup
    await dcf.connect(cfo).setWhite(liquidityReceiver.address, true);
    
    // Get the pair address from the contract
    const pairAddress = await dcf.pairAddress();
    
    // Get some tokens to addr1 for testing
    const addr1 = ethers.Wallet.createRandom().connect(ethers.provider);
    // Fund addr1 with some ETH for gas
    await owner.sendTransaction({
      to: addr1.address,
      value: ethers.parseEther("1.0")
    });
    
    const transferAmount = ethers.parseEther("1000");
    await dcf.transfer(addr1.address, transferAmount);
    
    // Add addr1 to white list so we can set up liquidity properly first
    await dcf.connect(cfo).setWhite(addr1.address, true);
    
    // Now test the critical case: sell with amount < 20 tokens
    // (20 tokens * 5 = 100, so (amount * 5) - 100 would be negative)
    const smallSellAmount = ethers.parseEther("10"); // 10 tokens < 20 tokens
    
    // Remove addr1 from white list to trigger the fee logic
    await dcf.connect(cfo).setWhite(addr1.address, false);
    
    // Attempt to sell small amount to pair - should fail in mutant due to underflow
    // The original would calculate fee = (10*18 * 5) / 100 = 0.5 tokens (valid)
    // The mutant would calculate fee = (10*18 * 5) - 100 = negative (revert)
    await expect(
      dcf.connect(addr1).transfer(pairAddress, smallSellAmount)
    ).to.be.reverted;
  });
});