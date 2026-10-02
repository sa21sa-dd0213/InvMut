import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant test - mde82fac5", function () {
  it("should revert when sending more than 10 ether (kills mutant with >=)", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 11 ether (more than 10) - should revert on original, but pass on mutant
    await expect(
      attacker.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("11")
      })
    ).to.be.reverted;
  });
});