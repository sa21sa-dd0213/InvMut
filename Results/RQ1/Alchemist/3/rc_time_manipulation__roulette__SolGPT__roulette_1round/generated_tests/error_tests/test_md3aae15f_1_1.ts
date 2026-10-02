import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant md3aae15f detection", function () {
  it("should kill the mutant by sending two consecutive fallback calls with 10 ether each, where the second has a later timestamp", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First valid call - sets pastBlockTime
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10"),
      })
    ).to.not.be.reverted;

    // Second call with later timestamp - should succeed in original (timestamp > pastBlockTime)
    // but should revert in mutant (timestamp < pastBlockTime is false)
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10"),
      })
    ).to.not.be.reverted; // This will pass on original but fail on mutant (revert)
  });
});