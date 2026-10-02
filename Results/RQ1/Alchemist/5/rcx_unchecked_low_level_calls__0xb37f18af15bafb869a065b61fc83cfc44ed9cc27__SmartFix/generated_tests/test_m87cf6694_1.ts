import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant m87cf6694 - overflow check removal", function () {
  it("should revert when depositsCount overflows due to overflow guard, but mutant would silently wrap", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send enough Ether to cause depositsCount to reach uint256 max
    const maxUint = ethers.MaxUint256;
    const oneEther = ethers.parseEther("1");

    // We need to send depositsCount to max-1 then one more to trigger overflow
    // Since depositsCount starts at 0, we need to send maxUint - 1 deposits first
    // But sending that many transactions is impractical. Instead, we directly set
    // depositsCount to maxUint - 1 using the contract's storage (only possible in testing)
    // Alternatively, we can test the overflow condition by sending one deposit when
    // depositsCount is already at maxUint - 1 (simulated by manipulating storage)

    // For a practical test, we can use ethers to set storage slot to maxUint - 1
    // Storage slot 1 corresponds to depositsCount (slot 0 is owner)
    const storageSlot = 1;
    const maxMinusOne = maxUint - 1n;
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      "0x" + storageSlot.toString(16).padStart(64, "0"),
      "0x" + maxMinusOne.toString(16).padStart(64, "0"),
    ]);

    // Now try to send Ether which would cause overflow
    // Original contract reverts, mutant would not
    const tx = instance.connect(addr1).sendTransaction({
      value: oneEther,
      to: await instance.getAddress(),
    });

    await expect(tx).to.be.reverted;
  });
});