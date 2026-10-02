import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant test - mde82fac5", function () {
  it("should revert when sending more than 10 ether (detect mutant with >=)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 11 ether (more than exactly 10) - should revert on original but succeed on mutant
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("11")
      })
    ).to.be.reverted;
  });
});