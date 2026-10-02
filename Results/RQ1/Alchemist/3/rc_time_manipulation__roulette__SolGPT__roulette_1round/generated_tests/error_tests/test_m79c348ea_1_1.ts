import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m79c348ea test", function () {
  it("should revert on second call within same timestamp block when using block.timestamp, but mutant using block.prevrandao will not revert", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send first transaction with 10 ether
    const tx1 = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Mine a new block with the same timestamp to ensure second call would revert on original
    await ethers.provider.send("evm_mine", [Math.floor(Date.now() / 1000)]);

    // Attempt second call with 10 ether - should revert on original but pass on mutant
    const tx2 = addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // On original contract this would revert due to block.timestamp check
    // On mutant using block.prevrandao, it will not revert - killing the mutant
    await expect(tx2).to.be.reverted;
  });
});