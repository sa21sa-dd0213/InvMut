import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test - m277fac66", function () {
  it("should revert when sending exactly 10 ether (mutant requires 11 ether)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 ether to the fallback function
    // Original: requires msg.value == 10 ether (passes)
    // Mutant: requires msg.value - 1 == 10 ether, i.e. msg.value == 11 ether (fails)
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10"),
      })
    ).to.be.reverted;
  });
});