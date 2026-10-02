import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection", function () {
  it("should revert when sending more than 10 ether (mutant allows it)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 11 ether (more than the required 10) - should revert on original but pass on mutant
    const tx = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("11")
    });

    await expect(tx).to.be.reverted;
  });
});