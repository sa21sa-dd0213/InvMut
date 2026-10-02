import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mc21c3882 - timestamp >= vs >", function () {
  it("should revert when sending two transactions in the same timestamp (original) but mutant would allow it", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send first valid transaction
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Mine a block with the same timestamp (or immediately after)
    await ethers.provider.send("evm_setNextBlockTimestamp", [
      (await ethers.provider.getBlock("latest")).timestamp
    ]);
    await ethers.provider.send("evm_mine");

    // Send second transaction - should revert on original (strict >) but pass on mutant (>=)
    const tx2 = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await expect(tx2).to.be.reverted;
  });
});