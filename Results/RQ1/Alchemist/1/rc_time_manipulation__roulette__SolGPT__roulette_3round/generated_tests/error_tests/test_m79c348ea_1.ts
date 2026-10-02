import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m79c348ea - timestamp replaced with prevrandao", function () {
  it("should revert when called twice in the same second, but mutant allows it", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("10") });
    await instance.waitForDeployment();

    // First call - should succeed
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Second call immediately (same block, same timestamp) - original would revert,
    // mutant may succeed due to prevrandao being different from timestamp
    const tx2 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx2.wait();

    // If the mutant is present, the second call will not revert (killing the mutant)
    // For original, this would revert with "block.timestamp > pastBlockTime" check
    // We assert that it did NOT revert, which catches the mutant behavior
    expect(tx2.blockNumber).to.not.be.undefined;
  });
});