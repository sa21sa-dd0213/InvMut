import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m277fac66 test", function () {
  it("should kill the mutant by sending exactly 10 ether and expecting success, which fails under mutant logic", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 ether to the fallback function
    // In the original contract, this should succeed (require(msg.value == 10 ether))
    // In the mutant, msg.value-1 == 10 ether means msg.value must be 11 ether,
    // so sending 10 ether will cause require to fail (10-1 != 10) and revert
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("10")
      })
    ).to.be.reverted;
  });
});