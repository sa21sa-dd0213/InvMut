import { expect } from "chai";
import { ethers } from "hardhat";

describe("NewIntelTechMedia mutant kill test - transfer", function () {
  it("should detect mutant that subtracts instead of adds recipient balance", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("NewIntelTechMedia");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Setup: owner sends some tokens to addr1 via distr to have balance to transfer
    // First, we need to call getTokens() or distr to give addr1 tokens
    // But getTokens() is payable and onlyWhitelist - we can call it as owner
    // Alternatively, use the NETM() function to give owner the totalDistributed
    await instance.connect(owner).NETM();
    
    // Transfer some tokens from owner to addr1 so addr1 has balance
    const transferAmount = ethers.parseEther("100");
    await instance.connect(owner).transfer(addr1.address, transferAmount);
    
    // Now transfer from addr1 to addr2
    const addr1BalanceBefore = await instance.balanceOf(addr1.address);
    const addr2BalanceBefore = await instance.balanceOf(addr2.address);
    const transferAmount2 = ethers.parseEther("50");
    
    await instance.connect(addr1).transfer(addr2.address, transferAmount2);
    
    const addr1BalanceAfter = await instance.balanceOf(addr1.address);
    const addr2BalanceAfter = await instance.balanceOf(addr2.address);
    
    // In original: addr1 balance decreases, addr2 balance increases
    // In mutant: addr1 balance decreases, addr2 balance also decreases (wrong)
    // So we check that addr2 balance increased
    expect(addr2BalanceAfter).to.equal(addr2BalanceBefore + transferAmount2);
  });
});