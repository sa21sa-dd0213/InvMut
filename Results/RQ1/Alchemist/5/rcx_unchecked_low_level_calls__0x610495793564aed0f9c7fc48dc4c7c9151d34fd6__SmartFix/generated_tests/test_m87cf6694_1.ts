import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect mutant that removes overflow protection in receive()", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the maximum uint256 value
    const MAX_UINT = ethers.MaxUint256;
    
    // First, increment depositsCount to near overflow
    // We need to send ETH to trigger the receive function which increments depositsCount
    // Since depositsCount starts at 0, we need to send MAX_UINT times to cause overflow
    // But that's impractical, so we'll directly set depositsCount via storage manipulation
    // to simulate the overflow scenario
    
    // Get the storage slot for depositsCount (slot 1, since owner is slot 0)
    const slot = ethers.hexlify(ethers.toBeHex(1, 32));
    
    // Set depositsCount to MAX_UINT - 1 to prepare for overflow
    await ethers.provider.send("hardhat_setStorageAt", [
      await instance.getAddress(),
      slot,
      ethers.zeroPadValue(ethers.toBeHex(MAX_UINT - 1n), 32)
    ]);
    
    // Verify depositsCount is at MAX_UINT - 1
    let depositsCount = await instance.depositsCount();
    expect(depositsCount).to.equal(MAX_UINT - 1n);

    // Now send 1 wei to trigger the receive function
    // In the original contract, this should revert due to overflow protection
    // In the mutant, it should succeed and wrap depositsCount to 0
    const tx = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });

    // In the original contract, this transaction should revert
    // In the mutant, it would succeed (which we want to detect)
    // We expect it to revert (original behavior), so if it doesn't revert, the mutant is detected
    await expect(tx).to.be.reverted;
  });
});