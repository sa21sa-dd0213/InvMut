import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mde82fac5 detection", function () {
  it("should revert when sending more than exactly 10 ether to fallback", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 15 ether to the contract via fallback - should revert in original (exact 10 ether required)
    // but would pass in mutant (>= 10 ether)
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("15")
      })
    ).to.be.reverted;
  });
});