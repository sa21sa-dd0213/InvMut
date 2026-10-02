import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - block.prevrandao vs block.timestamp", function () {
  it("should detect mutant m916b9143 by calling fallback twice in sequence", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("0") });
    await instance.waitForDeployment();

    // First call: send 10 ether to set pastBlockTime
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Get the stored pastBlockTime after first call
    const pastBlockTime = await instance.pastBlockTime();

    // Mine a new block where block.prevrandao could be lower than pastBlockTime
    // We force a new block and then check if the mutant reverts
    await ethers.provider.send("evm_mine", []);

    // Second call: send 10 ether again
    // In original: require(block.timestamp > pastBlockTime) - likely succeeds since time advances
    // In mutant: require(block.prevrandao > pastBlockTime) - may fail since prevrandao can be lower
    const tx2 = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // The mutant should revert because block.prevrandao is likely <= pastBlockTime
    await expect(tx2).to.be.reverted;
  });
});