import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant m70ebe76c - fee calculation test", function () {
  it("should detect mutant that changes fee from percentage to constant addition", async function () {
    const [owner, addr1, liquidityReceiver] = await ethers.getSigners();
    
    // Deploy DCF with required constructor argument
    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(liquidityReceiver.address);
    await instance.waitForDeployment();
    
    // Get the pair address from the contract
    const pairAddress = await instance.pairAddress();
    
    // Add some tokens to addr1 for testing
    const transferAmount = ethers.parseEther("1000");
    await instance.transfer(addr1.address, transferAmount);
    
    // Get initial balance of the contract itself (where fees accumulate)
    const initialContractBalance = await instance.balanceOf(instance.target);
    
    // Perform a sell transaction from addr1 to the pair address
    // This should trigger the fee calculation in _transfer
    const sellAmount = ethers.parseEther("100");
    await instance.connect(addr1).transfer(pairAddress, sellAmount);
    
    // Get the final balance of the contract
    const finalContractBalance = await instance.balanceOf(instance.target);
    
    // Calculate the fee that was taken
    const feeCollected = finalContractBalance - initialContractBalance;
    
    // In the original contract: fee = (amount * 5) / 100 = 5% of sell amount
    // In the mutant: fee = (amount + 5) / 100 = (sellAmount + 5) / 100
    // For a sell of 100 tokens:
    // Original: fee = 5 tokens
    // Mutant: fee = (100e18 + 5) / 100 ≈ 1e18 (1 token)
    
    const expectedOriginalFee = (sellAmount * BigInt(5)) / BigInt(100);
    const expectedMutantFee = (sellAmount + BigInt(5)) / BigInt(100);
    
    // Assert that the fee matches the original calculation (5% of amount)
    // This will pass on original but fail on mutant
    expect(feeCollected).to.equal(expectedOriginalFee);
    expect(feeCollected).to.not.equal(expectedMutantFee);
  });
});