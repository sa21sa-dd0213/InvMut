import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert on overflow when depositsCount reaches max uint256", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the max uint256 value
    const maxUint = ethers.MaxUint256;

    // Set depositsCount to max value by exploiting the fact that we can directly set it via storage
    // However, since we can't modify storage directly in tests, we'll use a different approach:
    // We'll send ether to the contract maxUint times to overflow depositsCount
    // But that's impractical. Instead, we'll simulate the overflow by:
    // 1. Sending 1 wei to trigger the receive function which increments depositsCount
    // 2. We need to find a way to set depositsCount to maxUint - 1 first
    
    // Alternative approach: We can use the fact that the contract has no setter for depositsCount
    // So we'll directly interact with the contract's storage to set depositsCount to maxUint - 1
    // Then send one more wei to trigger the overflow
    
    // Set storage slot 1 (depositsCount is the second variable after owner) to maxUint - 1
    const storageSlot = 1; // depositsCount is at slot 1 (slot 0 is owner)
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      "0x" + storageSlot.toString(16).padStart(64, "0"),
      ethers.toBeHex(maxUint - 1n, 32)
    ]);

    // Send 1 wei to trigger receive function - this should cause overflow
    // Original contract would revert due to require((depositsCount + 1) >= depositsCount)
    // Mutant would not revert and depositsCount would overflow to 0
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("0.001")
      })
    ).to.be.reverted;
  });
});