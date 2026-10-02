import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant test m2a879f35", function () {
  it("should revert when sending exactly 10 ether (mutant changes == to !=)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The original contract accepts exactly 10 ether and proceeds;
    // the mutant reverts when msg.value == 10 ether (because it requires != 10 ether).
    // Therefore, sending exactly 10 ether should revert on the mutant.
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10"),
      })
    ).to.be.reverted;
  });
});