import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mb6ced059", function () {
  it("should revert when sending exactly 10 ether to fallback (mutant requires 9 ether)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 ether - should revert in mutant because it expects msg.value+1 == 10 ether (i.e., 9 ether)
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted;
  });
});