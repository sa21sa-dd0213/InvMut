import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant test - m916b9143", function () {
  it("should revert when calling fallback twice in rapid succession (original timestamp check) but mutant may not revert due to prevrandao", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call should succeed
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Immediately call again (within same block/second)
    const tx2 = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // In original contract this should revert because block.timestamp == pastBlockTime
    // In mutant it may succeed if block.prevrandao > pastBlockTime
    await expect(tx2).to.be.reverted;
  });
});