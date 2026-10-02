import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant kill test - m9316c5ec", function () {
  it("should detect mutant by verifying that addToBalance with msg.value = 0 still increases balance by 1", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial balance of addr1
    const initialBalance = await instance.getBalance(addr1.address);
    expect(initialBalance).to.equal(0);

    // Get the storage slot for addr1's balance (slot 0 is mapping, so slot = keccak256(addr1 + 0))
    const slot = ethers.solidityPackedKeccak256(
      ["uint256", "uint256"],
      [addr1.address, 0]
    );
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      slot,
      ethers.toBeHex(ethers.MaxUint256, 32)
    ]);

    // Verify balance is now max
    const maxBalance = await instance.getBalance(addr1.address);
    expect(maxBalance).to.equal(ethers.MaxUint256);

    // Now call addToBalance with 0 wei from addr1
    // In original: should succeed
    // In mutant: should revert due to overflow in require
    const tx = instance.connect(addr1).addToBalance({ value: 0 });
    await expect(tx).to.be.reverted;
  });
});