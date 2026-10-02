import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant kill test", function () {
  it("should detect mutation from + to * by triggering overflow in depositsCount", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send ether to increment depositsCount to its maximum value
    // First, send enough ether to reach type(uint).max - 1
    const maxUint = ethers.MaxUint256;
    
    // We need to send ether many times to increment depositsCount
    // Since we can't loop in a single tx, we'll use a different approach:
    // Directly set storage slot for depositsCount to maxUint-1 via storage manipulation
    // This simulates the state needed to trigger overflow
    
    // Get storage slot for depositsCount (slot 1, since owner is slot 0)
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      "0x0000000000000000000000000000000000000000000000000000000000000001",
      ethers.zeroPadValue(ethers.toBeHex(ethers.MaxUint256), 32)
    ]);
    
    // Now depositsCount is maxUint, try to send ether to trigger receive()
    // Original: depositsCount + 1 would overflow (revert)
    // Mutant: depositsCount * 1 would NOT overflow (should pass)
    
    const tx = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });
    
    // The original contract would revert due to overflow check
    // The mutant would succeed because multiplication by 1 doesn't overflow
    // So we expect this transaction to succeed on the mutant but fail on original
    // We're testing for the mutant behavior (success) which would be incorrect
    await expect(tx).to.not.be.reverted;
    
    // Additional check: if the transaction succeeded, depositsCount should be maxUint+1 = 0
    // This confirms the mutation is present
    const finalCount = await instance.depositsCount();
    expect(finalCount).to.equal(0);
  });
});