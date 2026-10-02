import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m79c348ea - kill by consecutive calls in same block", function () {
  it("should revert on second call in same block (original) but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call: send exactly 10 ether
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Second call: send exactly 10 ether in the same block
    // In the original contract, this should revert because block.timestamp has not advanced
    // In the mutant, block.prevrandao may be lower than the previous prevrandao, so it may not revert
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted;
  });
});