import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant m77b497a5 - burnPair on sell", function () {
  it("should detect that burnPair is not called when condition is false", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy DCF with a liquidity receive address
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(addr2.address);
    await instance.waitForDeployment();
    
    // Get the pair address
    const pairAddress = await instance.pairAddress();
    
    // Set caller (cfo) to owner for setup
    await instance.setCaller(owner.address);
    
    // Transfer some DCF tokens to addr1 for testing
    const transferAmount = ethers.parseEther("1000");
    await instance.transfer(addr1.address, transferAmount);
    
    // Record initial total supply and pair balance
    const initialTotalSupply = await instance.totalSupply();
    const initialPairBalance = await instance.balanceOf(pairAddress);
    
    // White-list addr1 to avoid the initial checks
    await instance.setWhite(addr1.address, true);
    
    // Record balances before sell
    const totalSupplyBefore = await instance.totalSupply();
    const pairBalanceBefore = await instance.balanceOf(pairAddress);
    
    // Perform the sell by transferring to pair (this triggers the burn logic)
    const sellAmount = ethers.parseEther("500");
    await instance.connect(addr1).transfer(pairAddress, sellAmount);
    
    // Record balances after sell
    const totalSupplyAfter = await instance.totalSupply();
    const pairBalanceAfter = await instance.balanceOf(pairAddress);
    
    // Calculate expected values
    const fee = (sellAmount * 5n) / 100n;
    
    // In the mutant, burnPair is not called, so totalSupply only decreases by fee
    expect(totalSupplyAfter).to.equal(totalSupplyBefore - fee);
    
    // Pair balance should increase by sellAmount minus fee (no burn)
    expect(pairBalanceAfter).to.equal(pairBalanceBefore + sellAmount - fee);
  });
});