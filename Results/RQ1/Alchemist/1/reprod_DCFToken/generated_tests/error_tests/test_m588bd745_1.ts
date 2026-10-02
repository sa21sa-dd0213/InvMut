import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant test - fee calculation exponentiation", function () {
  it("should revert when transferring tokens with amount ** 5 instead of amount * 5", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy DCF with liquidity receive address
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(addr2.address);
    await instance.waitForDeployment();
    
    // Get the pair address from the contract
    const pairAddress = await instance.pairAddress();
    
    // Transfer some tokens to addr1 for testing
    const transferAmount = ethers.parseEther("1000");
    await instance.transfer(addr1.address, transferAmount);
    
    // Attempt to transfer from addr1 to pair address (this triggers fee calculation)
    // The original uses amount * 5 (5% fee), but mutant uses amount ** 5 (exponentiation)
    // amount ** 5 would be 1000^5 = 1e18, which divided by 100 is still huge and will revert
    const testAmount = ethers.parseEther("10");
    
    // Approve the contract to spend tokens from addr1
    await instance.connect(addr1).approve(instance.target, testAmount);
    
    // Try to transfer tokens to pair address - this should fail with mutant due to massive fee
    await expect(
      instance.connect(addr1).transfer(pairAddress, testAmount)
    ).to.be.reverted;
  });
});