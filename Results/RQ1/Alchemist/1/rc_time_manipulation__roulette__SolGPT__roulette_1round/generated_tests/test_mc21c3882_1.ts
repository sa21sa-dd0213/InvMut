import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mc21c3882 test", function () {
  it("should revert when calling fallback twice with same timestamp (original > behavior)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call - should succeed
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Second call with same timestamp - should revert in original (>), but pass in mutant (>=)
    // We force the same timestamp by mining both transactions in the same block
    // using hardhat's setNextBlockTimestamp to keep timestamp unchanged
    await ethers.provider.send("evm_setNextBlockTimestamp", [
      (await ethers.provider.getBlock("latest")).timestamp
    ]);

    const tx2 = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    await expect(tx2).to.be.reverted;
  });
});