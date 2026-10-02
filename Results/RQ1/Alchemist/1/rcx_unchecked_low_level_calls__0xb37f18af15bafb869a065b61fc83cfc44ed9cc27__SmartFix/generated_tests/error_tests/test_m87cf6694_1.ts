import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when depositsCount would overflow (kill mutant m87cf6694)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the max uint256 value for depositsCount (type(uint).max)
    const maxUint = ethers.MaxUint256;

    // Send ether repeatedly to increment depositsCount up to the max
    // We'll send 1 wei each time, depositsCount starts at 0
    // Need to send maxUint times to reach overflow, but we can't do that in a test.
    // Instead, we simulate the state by directly setting depositsCount to maxUint - 1
    // using storage manipulation (since there's no setter function)
    
    // Get the storage slot for depositsCount (slot 1, since owner is slot 0)
    const slot = 1;
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      "0x" + slot.toString(16).padStart(64, "0"),
      "0x" + (maxUint - 1n).toString(16).padStart(64, "0")
    ]);

    // Now send 1 wei to trigger receive() - this should make depositsCount go to maxUint
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("0.001")
    });

    // Now one more send should overflow in the mutant, but revert in original
    // The require check in original: ((depositsCount + 1) >= depositsCount) will be false
    // when depositsCount is maxUint (since maxUint + 1 = 0, and 0 >= maxUint is false)
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("0.001")
      })
    ).to.be.reverted;

    // Clean up storage (optional, but good practice)
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      "0x" + slot.toString(16).padStart(64, "0"),
      "0x" + "0".repeat(64)
    ]);
  });
});