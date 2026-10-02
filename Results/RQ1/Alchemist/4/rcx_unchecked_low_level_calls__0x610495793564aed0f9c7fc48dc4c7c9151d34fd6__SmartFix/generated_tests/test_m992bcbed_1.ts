import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect mutant m992bcbed by triggering overflow revert on receive()", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the max uint value
    const maxUint = ethers.MaxUint256;

    // First, we need to set depositsCount to maxUint - 1 by sending ether maxUint times
    // But that's impractical, so instead we directly manipulate storage slot 1 (depositsCount)
    // since we're testing the contract logic, not deploying through normal means
    // Actually, let's use a more practical approach - send ether many times to increment depositsCount
    
    // Let's use a loop to increment depositsCount to near max
    // We'll send 1 wei each time to increment depositsCount
    const targetCount = maxUint - 1n;
    
    // Send ether to increment depositsCount to maxUint - 1
    for (let i = 0; i < 5; i++) {
      // Actually, we can't do this efficiently in a test - let's use storage manipulation
      // Set depositsCount directly to maxUint using ethers provider storage set
      await ethers.provider.send("hardhat_setStorageAt", [
        await instance.getAddress(),
        "0x1", // slot 1 for depositsCount
        ethers.zeroPadValue(ethers.toBeHex(maxUint), 32)
      ]);
    }

    // Now depositsCount is at maxUint
    // Send ether to trigger receive() - should revert on original, pass on mutant
    await expect(
      addr1.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("0.001")
      })
    ).to.be.reverted;

    // Verify the depositsCount is still maxUint (unchanged because tx reverted)
    const depositsCountAfter = await instance.depositsCount();
    expect(depositsCountAfter).to.equal(maxUint);
  });
});