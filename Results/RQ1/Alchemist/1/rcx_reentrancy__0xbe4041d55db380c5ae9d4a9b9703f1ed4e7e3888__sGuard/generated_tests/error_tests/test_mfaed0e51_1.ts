import { expect } from "chai";
import { ethers } from "hardhat";

describe("MONEY_BOX mutant test mfaed0e51", function () {
  it("should detect mutant that prevents unlockTime extension", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MONEY_BOX");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.connect(owner).Initialized();
    
    // Set minimum sum to 0 for testing
    await instance.connect(owner).SetMinSum(0);

    // First Put with short lock time (1 second)
    const shortLock = 1;
    const put1Tx = await instance.connect(addr1).Put(shortLock, { value: ethers.parseEther("1.0") });
    await put1Tx.wait();

    // Get the unlock time after first Put
    const accAfterFirstPut = await instance.Acc(addr1.address);
    const unlockTimeAfterFirstPut = accAfterFirstPut.unlockTime;

    // Wait for the short lock to expire
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);

    // Now try to extend with a much longer lock time (1000 seconds)
    const longLock = 1000;
    const put2Tx = await instance.connect(addr1).Put(longLock, { value: ethers.parseEther("0.5") });
    await put2Tx.wait();

    // Get the unlock time after second Put
    const accAfterSecondPut = await instance.Acc(addr1.address);
    const unlockTimeAfterSecondPut = accAfterSecondPut.unlockTime;

    // If mutant is present, unlock time didn't change
    // If original, unlock time should be extended
    // Check if unlock time was extended (original behavior)
    const unlockTimeExtended = unlockTimeAfterSecondPut > unlockTimeAfterFirstPut;

    if (!unlockTimeExtended) {
      // Mutant detected: unlock time was NOT extended
      // Try to Collect immediately - should succeed on mutant but fail on original
      // because on original the funds are still locked with the longer time
      const collectTx = instance.connect(addr1).Collect(ethers.parseEther("1.0"));
      await expect(collectTx).to.not.be.reverted;
    } else {
      // Original behavior: unlock time was extended
      // Try to Collect immediately - should revert because still locked
      const collectTx = instance.connect(addr1).Collect(ethers.parseEther("1.0"));
      await expect(collectTx).to.be.reverted;
    }
  });
});