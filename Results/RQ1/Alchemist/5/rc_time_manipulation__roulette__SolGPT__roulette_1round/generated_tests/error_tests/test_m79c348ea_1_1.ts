import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - block.timestamp vs block.prevrandao", function () {
  it("should detect mutant by submitting two rapid transactions and expecting the second to revert on original but not on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with enough ether to satisfy the 10 ether requirement
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("100")
    });
    await fundTx.wait();

    // First call - should succeed (no previous timestamp check issue)
    const tx1 = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Immediately send a second transaction with the same timestamp
    // On the original contract, this should revert because block.timestamp hasn't increased
    // On the mutant, block.prevrandao is used which doesn't enforce time ordering
    await expect(
      addr1.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted; // This assertion will pass on original (revert expected) and fail on mutant (no revert)
  });
});