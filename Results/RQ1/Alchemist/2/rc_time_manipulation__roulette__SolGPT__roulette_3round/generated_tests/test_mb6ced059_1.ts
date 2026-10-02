import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mb6ced059 test", function () {
  it("should revert when sending exactly 10 ether because mutant expects 9 ether", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 ether - should pass on original but fail on mutant
    // because mutant condition is msg.value + 1 == 10 ether (expects 9 ether)
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted;
  });
});