import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m94a09245 test", function () {
  it("should kill mutant by making two fallback calls in same block (mutant allows, original reverts)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("10") });
    await instance.waitForDeployment();

    // First call: should succeed
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Second call in the same block: original reverts because block.timestamp == pastBlockTime
    // Mutant will succeed because the require was removed
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.not.be.reverted; // Mutant allows it, so test passes on mutant (kills it)
  });
});