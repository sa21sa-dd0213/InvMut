import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet - Mutant m992bcbed detection", function () {
  it("should revert when depositing to cause depositsCount overflow (original passes, mutant fails)", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set depositsCount to maximum uint256 value by manipulating storage
    // Storage slot 1 corresponds to depositsCount (slot 0 is owner)
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      "0x0000000000000000000000000000000000000000000000000000000000000001",
      "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
    ]);

    // Now depositsCount = type(uint256).max
    // Try to send 1 wei to trigger receive() - this should overflow
    // In original: require((depositsCount + 1) >= depositsCount) would revert due to overflow check
    // In mutant: require((depositsCount * 1) >= depositsCount) always true, allowing overflow
    await expect(
      attacker.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("1")
      })
    ).to.be.reverted; // Original reverts, mutant does not -> test kills mutant
  });
});