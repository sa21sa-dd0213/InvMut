import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant kill test - mc488289a", function () {
  it("should revert when non-whitelisted user transfers tokens expecting fee deduction", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy DCF with a liquidity receive address
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(addr2.address);
    await instance.waitForDeployment();
    
    // Transfer some tokens from owner to addr1 for testing
    const transferAmount = ethers.parseEther("100");
    await instance.connect(owner).transfer(addr1.address, transferAmount);
    
    // Verify addr1 has tokens and is not whitelisted
    const balanceBefore = await instance.balanceOf(addr1.address);
    expect(balanceBefore).to.equal(transferAmount);
    
    // Now addr1 tries to transfer to addr2 (both non-whitelisted)
    const sendAmount = ethers.parseEther("10");
    
    // Get the expected balance after fee (5% fee means 95% transferred)
    const expectedReceived = sendAmount * 95n / 100n;
    
    // Get balances before transfer
    const addr1BalanceBefore = await instance.balanceOf(addr1.address);
    const addr2BalanceBefore = await instance.balanceOf(addr2.address);
    
    // Execute the transfer
    await instance.connect(addr1).transfer(addr2.address, sendAmount);
    
    // Check balances after transfer
    const addr1BalanceAfter = await instance.balanceOf(addr1.address);
    const addr2BalanceAfter = await instance.balanceOf(addr2.address);
    
    // In the original contract, addr1 should lose full sendAmount (fee deducted to contract)
    // In the mutant (if true), addr1 loses exactly sendAmount and addr2 gets full sendAmount
    // The difference: in original, addr2 gets 95% of sendAmount; in mutant, addr2 gets 100%
    
    // Calculate what addr2 should have received in original (with 5% fee)
    const addr2ExpectedOriginal = addr2BalanceBefore + expectedReceived;
    
    // If the contract is mutant, addr2 would get full amount (no fee)
    // We detect the mutant by checking that addr2 did NOT get the full amount
    // (i.e., the fee was actually applied)
    expect(addr2BalanceAfter).to.equal(addr2ExpectedOriginal);
    
    // Also verify addr1 lost exactly the sendAmount (fee taken from total)
    expect(addr1BalanceAfter).to.equal(addr1BalanceBefore - sendAmount);
  });
});