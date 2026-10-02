import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet - kill mutant m87cf6694 (remove overflow check in receive)", function () {
  it("should revert when depositsCount reaches its maximum value and another deposit is attempted", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Calculate the number of deposits needed to overflow depositsCount (uint)
    // We need to send exactly 2^256 - currentDepositsCount times to reach max uint
    // Since depositsCount starts at 0, we need 2^256 deposits total
    // But we can't practically do that many, so we simulate by directly setting the storage
    // Get storage slot for depositsCount (slot 1 since owner is slot 0)
    const depositsCountSlot = 1;
    const maxUint = ethers.MaxUint256;
    
    // Set depositsCount to max value - 1 via storage manipulation (only for testing)
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      "0x" + depositsCountSlot.toString(16).padStart(64, "0"),
      ethers.zeroPadValue(ethers.toBeHex(maxUint - 1n), 32)
    ]);

    // Verify depositsCount is now max - 1
    expect(await instance.depositsCount()).to.equal(maxUint - 1n);

    // Send 1 wei to trigger receive - this should overflow and revert in original
    // In mutant, the overflow check is removed so it would succeed (mutant killed)
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("0.001")
      })
    ).to.be.reverted; // Original reverts due to overflow check, mutant would not revert
  });
});