import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m79c348ea test", function () {
  it("should revert on second sequential call due to timestamp check, but mutant passes", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call - should succeed
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Second call in same block - original reverts, mutant might succeed
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted;
  });
});