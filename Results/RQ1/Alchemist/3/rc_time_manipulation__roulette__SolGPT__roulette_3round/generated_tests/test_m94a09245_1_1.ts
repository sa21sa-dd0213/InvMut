import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m94a09245 - kill test", function () {
  it("should kill mutant by calling fallback twice in same block with same timestamp", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether so second call can succeed
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // First call - should succeed
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Second call in the same block (and same timestamp) - should fail on original but pass on mutant
    // Mine a new block to ensure we are in a new block (but same timestamp trick)
    await ethers.provider.send("evm_mine", []);

    // Now try second call - original would revert because pastBlockTime > block.timestamp
    // Mutant will succeed because require is removed
    const tx2 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // If mutant is present, tx2 will succeed; if original, it will revert
    // We expect it to succeed on the mutant (i.e., NOT revert)
    await expect(tx2).to.not.be.reverted;
  });
});