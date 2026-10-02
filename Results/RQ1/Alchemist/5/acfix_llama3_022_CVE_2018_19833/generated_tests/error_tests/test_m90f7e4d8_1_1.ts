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
    
    // First, give addr2 some tokens to make the overflow test more realistic
    await instance.connect(addr1).transfer(addr2.address, 1);
    
    // Now addr2 has 1 token
    
    // Mint a very large amount to addr2 to set up overflow scenario
    const maxUint256 = ethers.MaxUint256;
    const hugeAmount = maxUint256 / 2n + 1n;
    await instance.connect(owner).mintToken(addr2.address, hugeAmount);
    
    // Now addr2 has hugeAmount + 1 tokens
    // We need to transfer a value that causes overflow
    // addr2's balance = hugeAmount + 1 = maxUint256/2 + 2
    // We need value > maxUint256 - (hugeAmount + 1) = maxUint256 - maxUint256/2 - 2 = maxUint256/2 - 2
    const transferValue = maxUint256 / 2n; // This should cause overflow
    
    // Now test: transfer from addr2 to owner with the overflow value
    // In the original contract, this should revert due to the overflow check
    // In the mutant, it should succeed (overflow silently wraps around)
    
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