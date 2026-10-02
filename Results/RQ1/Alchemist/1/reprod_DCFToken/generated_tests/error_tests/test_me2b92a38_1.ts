import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant me2b92a38 - buy restriction check", function () {
  it("should revert when buying from pair address (from == pairAddress) in original, but mutant allows it", async function () {
    const [owner, buyer] = await ethers.getSigners();
    
    // Deploy DCF with a liquidity receive address
    const liquidityReceiveAddress = owner.address;
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(liquidityReceiveAddress);
    await instance.waitForDeployment();
    
    const dcfAddress = await instance.getAddress();
    
    // Get the pair address from the deployed contract
    const pairAddress = await instance.pairAddress();
    
    // Transfer some tokens to the pair address to simulate it having tokens
    // First mint some tokens to owner
    const transferAmount = ethers.parseEther("1000");
    await instance.transfer(pairAddress, transferAmount);
    
    // Now attempt to transfer FROM the pair address (simulating a buy)
    // This should revert in the original contract due to the "buy error" check
    // In the mutant where 'from == pairAddress' is replaced with 'false', it won't revert
    const smallAmount = ethers.parseEther("1");
    
    // We need to simulate a transfer where the pair is the sender
    // Since we can't directly call transfer from the pair, we'll use transferFrom
    // First approve the buyer to spend from pair
    // The pair contract needs to approve, but we don't have its private key
    // Instead, we can test by checking if the condition is bypassed
    
    // The most direct way: check if the contract behaves differently
    // In the original, any transfer from pairAddress reverts
    // In the mutant, it doesn't check this condition
    
    // Let's test by trying to transfer from pair (simulating a buy transaction)
    // We need to use the pair's tokens - let's use the pair's allowance
    // Actually, let's check the revert by calling the internal transfer path
    
    // Since we can't directly call _transfer, let's check if the pair address
    // is correctly identified as the from address in a swap scenario
    
    // Alternative approach: check that the mutant allows buys from pair
    // by verifying that the condition check is bypassed
    
    // For this test, we'll verify that the original contract reverts
    // by checking that the pair address is the sender
    const pairAsSigner = await ethers.getImpersonatedSigner(pairAddress);
    
    // Fund the pair with some ETH for gas
    await owner.sendTransaction({
      to: pairAddress,
      value: ethers.parseEther("1")
    });
    
    // Approve the pair to spend owner's tokens (for transferFrom)
    await instance.connect(owner).approve(pairAddress, transferAmount);
    
    // Try to transferFrom owner to buyer using pair as the spender
    // This should succeed in both versions (pair is spender, not from)
    
    // To test the actual mutation, we need to make 'from' be the pair address
    // We can do this by having the pair contract call transfer on behalf of itself
    // But the pair is just an EOA in impersonation mode
    
    // Let's test the actual mutation differently:
    // The mutation changes `from == pairAddress` to `false`
    // So any transfer where from IS the pair address will no longer revert
    
    // Let's directly call the contract's internal logic via a helper
    // Since we can't easily make the pair call transfer, let's check
    // if the pair address is set correctly
    
    // Verify the pair address is not zero
    expect(pairAddress).to.not.equal(ethers.ZeroAddress);
    
    // The key test: in the original, buying from pair reverts
    // In the mutant, it doesn't check this condition
    // We can test this by checking if the contract reverts when
    // we try to transfer FROM the pair address
    
    // Since we can't make the pair contract call transfer directly,
    // let's check if the contract has the buy restriction at all
    // by examining the bytecode or behavior
    
    // For a practical test, let's check that the mutation exists
    // by verifying the pair address is used in the condition
    
    // The simplest test: check that the contract reverts when
    // transferring from pair in the original, but not in mutant
    // We can test this by deploying and checking behavior
    
    // Let's use a different approach - check if the pair can receive
    // tokens (which it should be able to) and then if those tokens
    // can be transferred out (which should revert in original)
    
    // Send tokens to pair
    await instance.connect(owner).transfer(pairAddress, smallAmount);
    
    // Now try to transfer from pair to another address
    // This should revert in original because from == pairAddress
    // In mutant it will proceed because the check is disabled
    await expect(
      instance.connect(pairAsSigner).transfer(buyer.address, smallAmount)
    ).to.be.reverted; // Original reverts with "buy error", mutant might not
    
    // If the test passes (reverts), it means the original behavior is preserved
    // If it fails (doesn't revert), it means the mutant is present
    // This test will detect the mutant because the mutant won't revert
  });
});