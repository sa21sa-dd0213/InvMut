import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant detection - receive overflow check", function () {
  it("should revert when depositsCount overflows due to addition, but mutant allows it", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, set depositsCount to max uint256 by repeatedly sending ether
    // We need depositsCount = 2^256 - 1 to trigger overflow on next increment
    const maxUint = ethers.MaxUint256;
    
    // Send ether many times to increase depositsCount to near overflow
    // Since each send increments by 1, we need to send maxUint times
    // But for practical testing, we can use the fact that depositsCount starts at 0
    // and we need to reach 2^256 - 1. Instead, we can directly set it via storage
    // manipulation for testing purposes, or use a loop
    
    // For a real test, we'll manipulate storage to set depositsCount to max
    // Get storage slot of depositsCount (slot 1 since owner is slot 0)
    const slot = ethers.zeroPadValue(ethers.toBeHex(1), 32);
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      slot,
      ethers.zeroPadValue(ethers.toBeHex(maxUint), 32)
    ]);
    
    // Verify depositsCount is now max
    expect(await instance.depositsCount()).to.equal(maxUint);

    // Now send ether to trigger receive() - should revert in original, pass in mutant
    const tx = attacker.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });

    // In the original contract, this should revert due to overflow check
    // In the mutant (depositsCount * 1 >= depositsCount), it will pass
    await expect(tx).to.be.reverted;
  });
});