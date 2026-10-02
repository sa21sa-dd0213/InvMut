import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant detection - m8fe02759", function () {
  it("should detect mutant that skips token transfer when selling to pair address", async function () {
    const [owner, addr1, liquidityReceiver] = await ethers.getSigners();
    
    // Deploy DCF
    const DCF = await ethers.getContractFactory("DCF");
    const dcf = await DCF.deploy(liquidityReceiver.address);
    await dcf.waitForDeployment();
    
    // Get the pair address
    const pairAddress = await dcf.pairAddress();
    
    // Get the helper contract
    const helperAddress = await dcf.helperAddress();
    const LiquidityHelper = await ethers.getContractFactory("LiquidityHelper");
    const helper = LiquidityHelper.attach(helperAddress);
    
    // Transfer some tokens to addr1 for testing
    const transferAmount = ethers.parseEther("10000");
    await dcf.transfer(addr1.address, transferAmount);
    
    // Get initial balance of pair address
    const initialPairBalance = await dcf.balanceOf(pairAddress);
    
    // Simulate a sell transaction to the pair address (as addr1)
    // First approve the DCF contract to spend tokens on behalf of addr1
    await dcf.connect(addr1).approve(dcf.target, transferAmount);
    
    // Perform a transfer to the pair address simulating a sell
    const sellAmount = ethers.parseEther("1000");
    const tx = dcf.connect(addr1).transfer(pairAddress, sellAmount);
    
    // Get final balance of pair address
    const finalPairBalance = await dcf.balanceOf(pairAddress);
    
    // Calculate expected transfer (with 5% fee)
    const fee = (sellAmount * 5n) / 100n;
    const expectedTransfer = sellAmount - fee;
    
    // In the original contract, the tokens should be transferred to pair address
    // In the mutant, the transfer to pair address is skipped
    // The test should fail on mutant because pair balance won't increase
    expect(finalPairBalance - initialPairBalance).to.equal(expectedTransfer);
  });
});