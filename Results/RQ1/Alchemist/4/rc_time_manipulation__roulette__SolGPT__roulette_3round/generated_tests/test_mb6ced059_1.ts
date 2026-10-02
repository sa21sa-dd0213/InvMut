import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mb6ced059 detection", function () {
  it("should revert when sending exactly 10 ether to fallback (mutant expects 9 ether)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call sets pastBlockTime, making the second call possible
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Now send exactly 10 ether - original accepts, mutant rejects
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted;
  });
});