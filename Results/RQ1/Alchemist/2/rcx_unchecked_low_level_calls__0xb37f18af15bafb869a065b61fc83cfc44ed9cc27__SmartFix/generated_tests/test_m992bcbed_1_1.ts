import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when depositsCount overflows after reaching max uint (kills mutant m992bcbed)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the storage slot for depositsCount (slot 1, after owner at slot 0)
    const storageSlot = ethers.toBeHex(1, 32);

    // Set depositsCount to type(uint).max - 1 (so next deposit will trigger overflow check)
    const maxUint = ethers.MaxUint256;
    const nearMax = maxUint - 1n;

    // Use hardhat_setStorageAt to directly set the storage
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      storageSlot,
      ethers.toBeHex(nearMax, 32)
    ]);

    // Verify depositsCount is now nearMax
    expect(await instance.depositsCount()).to.equal(nearMax);

    // Now send 1 wei to trigger receive() - this should cause overflow check to fail
    // Original: ((depositsCount + 1) >= depositsCount) will be false when depositsCount is max
    // Mutant: ((depositsCount * 1) >= depositsCount) will always be true
    const tx = owner.sendTransaction({
      to: await instance.getAddress(),
      value: 1n
    });

    // On original contract this should revert, on mutant it would succeed
    await expect(tx).to.be.reverted;
  });
});