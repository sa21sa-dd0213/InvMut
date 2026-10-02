import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m79c348ea test", function () {
  it("should revert when calling fallback twice in same timestamp, but mutant allows second call", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("0") });
    await instance.waitForDeployment();

    // First call with 10 ether - should succeed
    const tx1 = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Immediately call again with 10 ether - should revert in original (same block timestamp)
    // But mutant may allow it if block.prevrandao has changed
    await expect(
      addr1.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted; // Original reverts; mutant might not revert, killing it
  });
});