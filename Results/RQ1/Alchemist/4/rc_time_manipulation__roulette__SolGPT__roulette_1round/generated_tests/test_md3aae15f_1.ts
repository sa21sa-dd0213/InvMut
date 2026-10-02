import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant test - kill md3aae15f (replaced > with <)", function () {
  it("should revert second transaction when timestamp is later (mutant expects earlier)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call - set pastBlockTime
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Get the stored pastBlockTime after first call
    const pastBlockTime = await instance.pastBlockTime();

    // Wait for at least 1 second to ensure timestamp increases
    await ethers.provider.send("evm_increaseTime", [1]);
    await ethers.provider.send("evm_mine", []);

    // Second call - should succeed in original (timestamp > pastBlockTime)
    // but should revert in mutant (timestamp < pastBlockTime is false)
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted;
  });
});