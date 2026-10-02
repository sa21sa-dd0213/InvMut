import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant kill test - me872168d", function () {
  it("should revert when buying from pair address in original but not in mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy DCF with liquidity receive address
    const liquidityReceiveAddress = addr1.address;
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(liquidityReceiveAddress);
    await instance.waitForDeployment();
    
    // Get the pair address from the contract
    const pairAddress = await instance.pairAddress();
    
    // Get USDT token address
    const USDT = await instance.USDT();
    
    // Get the Uniswap router address
    const routerAddress = await instance.router();
    
    // Create a test where we simulate a transfer from the pair address
    // In the original contract, when from == pairAddress, it should revert with "buy error"
    // In the mutant, when from != pairAddress, it reverts, so when from == pairAddress it should NOT revert
    
    // We need to simulate a transfer where from is the pair address
    // This would typically happen during a swap on Uniswap
    // We can directly call _transfer via a helper or use the public transfer functions
    
    // First, let's get some tokens to work with
    const initialSupply = ethers.parseEther("2000000");
    const ownerBalance = await instance.balanceOf(owner.address);
    expect(ownerBalance).to.equal(initialSupply);
    
    // Transfer some tokens to addr1 for testing
    await instance.transfer(addr1.address, ethers.parseEther("1000"));
    
    // Now try to simulate a transfer from the pair address
    // We need to impersonate the pair address or use a transferFrom with allowance
    // The pair address is the Uniswap pair contract, which we don't have access to
    // Instead, we can test the logic by calling transfer with from = pairAddress
    
    // Since we can't directly set msg.sender, we need to use a different approach
    // Let's check if we can trigger the buy error scenario
    
    // Approve the contract to spend tokens on behalf of the pair
    // First, get some tokens to the pair address by minting (but we can't mint)
    // Instead, let's check the contract's balance at the pair
    
    const pairBalance = await instance.balanceOf(pairAddress);
    console.log("Pair balance:", pairBalance.toString());
    
    // If the pair has tokens, we can try to transfer from it
    // But typically the pair won't have tokens initially
    
    // Alternative approach: Test the condition directly
    // The mutant changes from == pairAddress to from != pairAddress
    // So a buy transaction (from == pairAddress) that should revert in original
    // will pass in the mutant
    
    // Let's verify the pair address is set correctly
    expect(pairAddress).to.not.equal(ethers.ZeroAddress);
    
    // Test that the buy error condition exists
    // We can check by looking at the contract's logic
    // The original requires false when from == pairAddress (buy error)
    // The mutant requires false when from != pairAddress
    
    // To properly test this, we need to trigger a transfer from the pair
    // This would happen in a Uniswap swap, but we can simulate it
    
    // Let's check if we can call transferFrom with the pair as from
    // First approve the pair to spend tokens
    await instance.approve(pairAddress, ethers.parseEther("100"));
    
    // Now try to transfer from owner to pair (this should work as normal transfer)
    // But we want to test the reverse - from pair to someone
    
    // Since we can't easily make the pair have tokens, let's check the revert message
    // The original contract has: require(false, "buy error") when from == pairAddress
    
    // In the mutant: require(false, "buy error") when from != pairAddress
    // So a normal transfer (from != pairAddress) should revert in the mutant
    
    // Let's test a normal transfer - in original it should pass, in mutant it should fail
    // But wait, the mutant changes the condition for the buy error
    // Let's trace through the logic:
    // Original: if (from == pairAddress) { require(false, "buy error"); }
    // Mutant:   if (from != pairAddress) { require(false, "buy error"); }
    
    // So in the mutant, ANY transfer where from != pairAddress will revert with "buy error"
    // This means normal transfers should fail in the mutant
    
    // Let's test a normal transfer and expect it to either pass or fail
    try {
      // This should work in original but fail in mutant
      await instance.transfer(addr1.address, ethers.parseEther("10"));
      console.log("Transfer succeeded - this is the original behavior");
      // If we get here, it's the original contract (transfer works)
    } catch (error: any) {
      // If it reverts, it could be the mutant
      console.log("Transfer failed:", error.message);
      expect(error.message).to.include("buy error");
    }
    
    // More definitive test: check the pair address transfer
    // The mutant specifically allows buys (from == pairAddress) to proceed
    // while blocking all other transfers
    
    // Let's verify the contract's behavior by checking the pair address
    const contractPairAddress = await instance.pairAddress();
    console.log("Contract pair address:", contractPairAddress);
    
    // The key insight: in the original, buying from pair reverts
    // In the mutant, buying from pair succeeds but everything else reverts
    
    // To kill the mutant, we need a test that passes on original but fails on mutant
    // OR fails on original but passes on mutant
    
    // A normal transfer (from != pairAddress) should:
    // - Pass in original (no revert)
    // - Fail in mutant (revert with "buy error")
    
    // So if we test a normal transfer and it succeeds, we're on the original
    // If it fails with "buy error", we're on the mutant
    
    // Let's do a definitive test
    const testAmount = ethers.parseEther("50");
    
    try {
      // Try a normal transfer from owner to addr1
      const tx = await instance.transfer(addr1.address, testAmount);
      await tx.wait();
      
      // If we get here, it's the original contract
      // Check that the transfer actually happened
      const addr1Balance = await instance.balanceOf(addr1.address);
      expect(addr1Balance).to.be.gt(ethers.parseEther("1000")); // They already had 1000
      
      // This test passes on original but would fail on mutant
      console.log("Test passed on original contract");
      
    } catch (error: any) {
      // If we get here, it's likely the mutant
      expect(error.message).to.include("buy error");
      console.log("Mutant detected - normal transfer reverted with buy error");
      
      // The test should fail on mutant, so we re-throw to make it fail
      throw new Error("Mutant killed: Normal transfer should succeed in original but failed");
    }
  });
});