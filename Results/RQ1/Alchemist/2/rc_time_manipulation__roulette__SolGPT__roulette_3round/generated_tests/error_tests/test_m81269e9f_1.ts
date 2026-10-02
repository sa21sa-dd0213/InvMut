import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection (m81269e9f)", function () {
  it("should detect the mutation by allowing two consecutive calls in the same second", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const tenEther = ethers.parseEther("10");

    // First call - should succeed (sets pastBlockTime to block.timestamp)
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: tenEther
    });
    await tx1.wait();

    // Second call in the same second - original would revert due to require(block.timestamp > pastBlockTime)
    // Mutant allows it because pastBlockTime = block.timestamp * 1 = block.timestamp (not incremented)
    const tx2 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: tenEther
    });

    // The mutant will NOT revert here, but the original would
    await expect(tx2.wait()).to.not.be.reverted;
  });
});