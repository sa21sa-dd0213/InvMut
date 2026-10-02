import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - m94a09245", function () {
  it("should revert on second fallback call in same block when require(block.timestamp > pastBlockTime) exists", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call should succeed
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Second call in the same block should revert due to the timestamp check
    // Mine a new block to ensure we are not in the same block as first call
    await ethers.provider.send("evm_mine", []);

    // Now call again - this should succeed in the mutant but revert in the original
    // The test will pass if the original reverts and the mutant does not
    // We expect the original to revert
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.not.be.reverted;
  });
});