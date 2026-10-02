import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m2a879f35 detection", function () {
  it("should revert when sending exactly 10 ether to the mutated contract (due to != instead of ==)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 ether - in the original this would succeed, but the mutant reverts
    const tx = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    await expect(tx).to.be.reverted;
  });
});