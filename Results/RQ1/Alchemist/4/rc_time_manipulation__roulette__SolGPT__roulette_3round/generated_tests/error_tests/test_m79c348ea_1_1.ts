import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m79c348ea test", function () {
  it("should kill mutant by exploiting block.prevrandao instead of block.timestamp", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 10 ether to satisfy first call
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Mine a block to change timestamp but keep same block number parity
    await ethers.provider.send("evm_mine", []);

    // Send another 10 ether - on original this should revert because block.timestamp > pastBlockTime
    // On mutant, block.prevrandao might be same or different, but the logic is broken
    const tx2 = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // The mutant should NOT revert because block.prevrandao is not time-based
    // If the test expects revert but it succeeds, the mutant is killed
    await expect(tx2).to.not.be.reverted;
  });
});