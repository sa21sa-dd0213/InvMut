import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant test - mc21c3882 (>= instead of >)", function () {
  it("should revert when sending two transactions with the same timestamp", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("0") });
    await instance.waitForDeployment();

    // Fund the contract with enough ether to satisfy require(msg.value == 10 ether)
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("20")
    });

    // First transaction - should succeed
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10"),
      gasLimit: 100000
    });
    await tx1.wait();

    // Mine a new block with the same timestamp as the previous block
    // This ensures block.timestamp is not increased
    await ethers.provider.send("evm_mine", []);
    
    // Second transaction at the same timestamp - should revert on original (>), pass on mutant (>=)
    const tx2 = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10"),
      gasLimit: 100000
    });

    await expect(tx2).to.be.reverted;
  });
});