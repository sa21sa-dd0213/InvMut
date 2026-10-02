import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID mutant test - burn function operator replacement", function () {
  it("should detect division instead of subtraction in burn function", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, get tokens for addr1 via getTokens() - need to send ETH
    // The getTokens() function requires value to be <= totalRemaining (initially 300000000e18)
    // and sends 'value' tokens (initially 1000e18) to the caller
    await instance.connect(addr1).getTokens({ value: ethers.parseEther("1") });
    
    // Check addr1's balance after receiving tokens
    const initialBalance = await instance.balanceOf(addr1.address);
    
    // Burn a specific amount that is not an exact divisor of the initial balance
    // For example, if initial balance is 1000e18, burn 300e18
    // Original: 1000e18 - 300e18 = 700e18
    // Mutant:   1000e18 / 300e18 = 3 (integer division)
    const burnAmount = ethers.parseEther("300");
    
    // Only owner can burn, but we need to test from addr1's perspective
    // Actually, the burn function has onlyOwner modifier, so we need to test from owner
    // Transfer some tokens from owner to addr1 first, then have owner burn addr1's tokens
    // Actually, burn function burns msg.sender's tokens, so owner needs tokens first
    
    // Get tokens for owner too
    await instance.connect(owner).getTokens({ value: ethers.parseEther("1") });
    
    const ownerInitialBalance = await instance.balanceOf(owner.address);
    
    // Owner burns their own tokens
    await instance.connect(owner).burn(burnAmount);
    
    const ownerFinalBalance = await instance.balanceOf(owner.address);
    
    // Original contract would do: ownerInitialBalance - burnAmount
    // Mutant does: ownerInitialBalance / burnAmount
    // Since burnAmount (300e18) does not divide ownerInitialBalance (1000e18) evenly,
    // the results will differ
    
    // Check that the balance is NOT equal to what the mutant would produce
    // Mutant would produce: ownerInitialBalance / burnAmount
    const expectedOriginal = ownerInitialBalance - burnAmount;
    const expectedMutant = ownerInitialBalance / burnAmount;
    
    // The test should pass on original (showing subtraction) and fail on mutant (showing division)
    expect(ownerFinalBalance).to.equal(expectedOriginal);
    expect(ownerFinalBalance).to.not.equal(expectedMutant);
  });
});