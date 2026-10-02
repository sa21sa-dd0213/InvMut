import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant test - setDistributeAddress", function () {
  it("should kill mutant mc84148c7 by verifying distributeToken sends to the correct address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy DCF with a liquidity receive address
    const DCF = await ethers.getContractFactory("DCF");
    const instance = await DCF.deploy(addr1.address);
    await instance.waitForDeployment();
    
    // Set the CFO (caller) to owner
    await instance.setCaller(owner.address);
    
    // Set a specific distribution address (different from USDT contract address)
    const distributeAddr = addr1.address;
    await instance.setDistributeAddress(distributeAddr);
    
    // Mint tokens to the contract for distribution
    const mintAmount = ethers.parseEther("3000");
    await instance.transfer(await instance.getAddress(), mintAmount);
    
    // Record balance of the intended distribution address before
    const balanceBefore = await instance.balanceOf(distributeAddr);
    
    // Call distributeToken
    await instance.distributeToken();
    
    // Record balance after
    const balanceAfter = await instance.balanceOf(distributeAddr);
    
    // The distribution address should have received the tokens (2000 tokens)
    // If the mutant is active, tokens would go to USDT address instead
    expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("2000"));
    
    // Additional check: USDT contract address should NOT have received tokens
    const usdtAddress = "0x55d398326f99059fF775485246999027B3197955";
    const usdtBalance = await instance.balanceOf(usdtAddress);
    expect(usdtBalance).to.equal(0);
  });
});