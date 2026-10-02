import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test - mde82fac5", function () {
  it("should revert when sending more than exactly 10 ether (detects == replaced with >=)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 11 ether (greater than 10) to the fallback function - should revert in original but pass in mutant
    await expect(
      owner.sendTransaction({
        to: instance.target,
        value: ethers.parseEther("11")
      })
    ).to.be.reverted;
  });
});