import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant kill test - overflow require removal", function () {
  it("should revert on overflow in receive() on original but succeed on mutant", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the storage slot for depositsCount (slot 1, since owner is slot 0)
    const slot = ethers.hexlify("0x01");
    const maxUint = ethers.MaxUint256;

    // Set depositsCount to max value
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      slot,
      ethers.zeroPadValue(maxUint, 32)
    ]);

    // Now send 1 wei via receive() - should revert on original due to overflow check
    // but on mutant it would succeed because the require is removed
    const tx = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("0.001")
    });

    // On original, this reverts; on mutant it does not
    await expect(tx).to.be.reverted;
  });
});