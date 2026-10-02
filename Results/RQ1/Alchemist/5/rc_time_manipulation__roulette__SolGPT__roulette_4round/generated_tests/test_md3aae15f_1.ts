import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant md3aae15f test", function () {
  it("should kill mutant by testing timestamp comparison direction", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("0") });
    await instance.waitForDeployment();

    // First call: sets pastBlockTime to current block.timestamp
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Second call with a later timestamp (in a new block)
    // In the original contract, this should succeed because block.timestamp > pastBlockTime
    // In the mutant, this should revert because block.timestamp < pastBlockTime is false
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.not.be.reverted;
  });
});