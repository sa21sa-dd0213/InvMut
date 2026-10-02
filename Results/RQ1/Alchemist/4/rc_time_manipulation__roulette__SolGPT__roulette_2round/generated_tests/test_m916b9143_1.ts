import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - m916b9143", function () {
  it("should detect mutation by calling fallback twice in quick succession expecting revert on second call", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with initial balance (optional, but fallback requires msg.value == 10 ether)
    const fundAmount = ethers.parseEther("10");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("30")
    });

    // First call should succeed (timestamp > pastBlockTime, which is 0 initially)
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });

    // Second call in the same block (or very quickly) should revert in original
    // because block.timestamp may not have increased enough, but in mutant
    // block.prevrandao may be > pastBlockTime, causing it to NOT revert.
    // We expect revert to detect the mutant.
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: fundAmount
      })
    ).to.be.reverted;
  });
});