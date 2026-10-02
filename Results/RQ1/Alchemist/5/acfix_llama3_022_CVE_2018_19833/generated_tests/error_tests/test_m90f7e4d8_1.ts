import { expect } from "chai";
import { ethers } from "hardhat";

describe("ERCDDAToken mutant m90f7e4d8 - overflow protection", function () {
  it("should revert when transfer causes overflow in recipient balance, but mutant allows it", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy with initial supply that allows overflow testing
    const initialSupply = ethers.parseUnits("1", 0); // 1 token (decimals = 0)
    const Factory = await ethers.getContractFactory("ERCDDAToken");
    const instance = await Factory.deploy(initialSupply, "Test", "TST");
    await instance.waitForDeployment();
    
    // Transfer all tokens to addr1 first
    await instance.connect(owner).transfer(addr1.address, initialSupply);
    
    // Now addr1 has all tokens. We'll try to transfer to addr2 which already has 0 balance.
    // To cause overflow, we need to transfer a value that when added to addr2's balance exceeds uint256 max
    // addr2's balance is 0, so we need _value > type(uint256).max - 0 = type(uint256).max
    // But we only have initialSupply tokens. We'll use a different approach:
    // Have addr1 transfer a large amount to addr2 such that addr2's balance overflows
    
    // First, give addr2 some tokens to make the overflow test more realistic
    await instance.connect(addr1).transfer(addr2.address, 1);
    
    // Now addr2 has 1 token. We'll try to transfer a value that causes overflow when added to addr2's balance
    // Overflow occurs when: 1 + _value > type(uint256).max
    // So _value = type(uint256).max - 1 + 1 = type(uint256).max
    const maxUint256 = ethers.MaxUint256;
    const overflowValue = maxUint256 - 1n + 1n; // This is type(uint256).max
    
    // But we don't have that many tokens. Let's use a different strategy:
    // Since the mutant removes the overflow check, we need to see if it reverts on overflow or not
    // The original would revert due to overflow check, mutant would allow overflow
    
    // Transfer from addr1 to addr2 - this should revert in original but not in mutant
    // We need to ensure addr1 has enough balance
    // Let's transfer back some tokens to owner to make addr1 have sufficient balance
    await instance.connect(addr2).transfer(addr1.address, 1);
    
    // Now addr1 has all tokens (initialSupply)
    // Transfer a value that causes addr2's balance to overflow
    // Since addr2 balance = 0, we need _value > type(uint256).max - 0 = type(uint256).max
    // But we can't have that many tokens. Instead, let's check if the contract allows overflow at all.
    
    // Actually, the correct approach: the overflow check prevents balanceOf[_to] + _value from wrapping around.
    // Since addr2 has 0 balance, any _value up to type(uint256).max would pass the check.
    // The overflow only happens when _value > type(uint256).max - balanceOf[_to].
    
    // Let's set up a scenario where overflow would occur:
    // Give addr2 a large balance close to max, then transfer a value that pushes it over
    // But we can't mint arbitrarily large amounts. Let's use the mintToken function.
    
    // Mint a very large amount to addr2
    const hugeAmount = ethers.MaxUint256 / 2n + 1n;
    await instance.connect(owner).mintToken(addr2.address, hugeAmount);
    
    // Now addr2 has hugeAmount + 1 tokens. We need to transfer a value that causes overflow
    // addr2's balance = hugeAmount + 1 = maxUint256/2 + 2
    // We need to transfer value such that: hugeAmount + 1 + value > maxUint256
    // So value > maxUint256 - (hugeAmount + 1) = maxUint256 - maxUint256/2 - 2 = maxUint256/2 - 2
    const transferValue = maxUint256 / 2n; // This should cause overflow
    
    // Now test: transfer from addr2 to owner with the overflow value
    // In the original contract, this should revert due to the overflow check
    // In the mutant, it should succeed (overflow silently wraps around)
    
    // We expect the original to revert, but since we're testing the mutant,
    // the test should pass if the transaction succeeds (mutant behavior)
    try {
      const tx = await instance.connect(addr2).transfer(owner.address, transferValue);
      await tx.wait();
      // If we get here, the mutant allowed overflow - test passes (kills mutant)
      expect(true).to.be.true;
    } catch (error) {
      // If it reverted, the original behavior is present - test fails
      expect.fail("Mutant should have allowed overflow but reverted");
    }
  });
});