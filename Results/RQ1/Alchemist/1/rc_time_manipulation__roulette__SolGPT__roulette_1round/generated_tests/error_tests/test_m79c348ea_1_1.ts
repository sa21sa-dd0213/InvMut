import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test - block.prevrandao vs block.timestamp", function () {
  it("should revert when called twice in the same block timestamp, but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send first transaction with exactly 10 ether
    const tx1 = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Now mine a new block with the same timestamp to force second call
    // First, get the current timestamp
    const block = await ethers.provider.getBlock("latest");
    const currentTimestamp = block!.timestamp;

    // Mine a new block with the exact same timestamp
    await ethers.provider.send("evm_setNextBlockTimestamp", [currentTimestamp]);
    await ethers.provider.send("evm_mine", []);

    // Second call should revert in original (timestamp not > pastBlockTime)
    // In mutant, it will succeed because block.prevrandao changes with each block
    const tx2 = addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // The mutant will not revert, so this assertion will fail, killing the mutant
    await expect(tx2).to.be.reverted;
  });
});