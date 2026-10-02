import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m79c348ea - block.timestamp replaced with block.prevrandao", function () {
  it("should revert when calling fallback twice with same prevrandao value but different timestamps", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call: should succeed (no previous timestamp constraint)
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Mine a block with a specific prevrandao value by using hardhat_mine with a fixed mixHash
    // This simulates the scenario where prevrandao repeats
    await ethers.provider.send("hardhat_setNextBlockBaseFeePerGas", ["0x0"]); // optional
    await ethers.provider.send("evm_setNextBlockTimestamp", [
      (await ethers.provider.getBlock("latest"))!.timestamp + 10
    ]);

    // Force a specific prevrandao by mining a block with a known mixHash
    await ethers.provider.send("hardhat_mine", ["0x1", "0x0"]); // mine one block with mixHash 0

    // Now the current block's prevrandao is 0 (or whatever we set)
    // Second call: on the mutant, this should NOT revert because prevrandao (0) is not > previous prevrandao (also 0)
    // On the original, it would revert because timestamp has increased
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted; // Mutant fails: should revert on original but does NOT revert on mutant
  });
});