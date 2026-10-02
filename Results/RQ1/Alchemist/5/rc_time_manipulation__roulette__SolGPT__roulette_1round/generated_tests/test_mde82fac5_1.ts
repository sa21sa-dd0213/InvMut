import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - mde82fac5", function () {
  it("should revert when sending exactly 10.1 ether (not exactly 10) to detect mutant with >= instead of ==", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 10.1 ether (greater than 10, not equal) - should revert on original but pass on mutant
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10.1")
      })
    ).to.be.reverted;
  });
});