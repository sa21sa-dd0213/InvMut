import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test - mde82fac5", function () {
  it("should revert when sending more than 10 ether on original, but not on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 11 ether (more than 10) - should revert on original, pass on mutant
    await expect(
      addr1.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("11"),
      })
    ).to.be.reverted;
  });
});