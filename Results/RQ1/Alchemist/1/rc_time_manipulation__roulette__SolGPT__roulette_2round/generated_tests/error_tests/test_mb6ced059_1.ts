import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mb6ced059 detection", function () {
  it("should revert when sending exactly 10 ether to fallback (mutant expects 10 ether - 1 wei)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 ether - this should pass on original but revert on mutant
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted;
  });
});