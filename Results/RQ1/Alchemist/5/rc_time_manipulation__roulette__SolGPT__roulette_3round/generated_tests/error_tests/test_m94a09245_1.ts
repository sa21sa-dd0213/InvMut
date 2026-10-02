import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Roulette mutant m94a09245 test", function () {
  it("should detect removal of timestamp check by sending two calls in the same block", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const tenEther = ethers.parseEther("10");

    // First call should succeed
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: tenEther
    });

    // Second call in the same block should revert on original (due to timestamp check)
    // On mutant it would succeed, so we expect revert to kill the mutant
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: tenEther
      })
    ).to.be.reverted;
  });
});