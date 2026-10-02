import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet - Mutant m992bcbed detection", function () {
  it("should revert when depositing to cause depositsCount overflow (original passes, mutant fails)", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set depositsCount to maximum uint256 value by repeated deposits
    // We need to send ether to increment depositsCount to type(uint256).max
    // Since each deposit increments by 1, we need type(uint256).max deposits
    // This is impractical directly, so we manipulate state via storage
    // Instead, we use the contract's storage to set depositsCount to max
    // Get storage slot for depositsCount (slot 1, since owner is slot 0)
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      "0x0000000000000000000000000000000000000000000000000000000000000001",
      "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
    ]);

    // Now depositsCount = type(uint256).max
    // Try to send 1 wei to trigger receive() - this should overflow
    // In original: require((max+1) >= max) would revert due to overflow check
    // In mutant: require((max*1) >= max) always true, allowing overflow
    await expect(
      attacker.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("1")
      })
    ).to.be.reverted; // Original reverts, mutant does not -> test kills mutant
  });
});