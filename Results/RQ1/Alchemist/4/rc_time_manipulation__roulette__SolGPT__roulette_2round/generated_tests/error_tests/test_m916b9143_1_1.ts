import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - m916b9143", function () {
  it("should detect mutation by calling fallback twice in quick succession expecting revert on second call", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with initial balance
    const fundAmount = ethers.parseEther("10");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("30")
    });

    // First call should succeed
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });

    // Second call should revert because block.timestamp hasn't increased
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: fundAmount
      })
    ).to.be.reverted;
  });
});