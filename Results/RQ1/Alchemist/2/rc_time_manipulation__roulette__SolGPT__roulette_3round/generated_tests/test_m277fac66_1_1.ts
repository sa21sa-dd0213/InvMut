import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - m277fac66", function () {
  it("should revert when sending 11 ether (original rejects, mutant incorrectly accepts)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 11 ether - original requires exactly 10 ether, so it should revert
    // The mutant changes require(msg.value == 10 ether) to require(msg.value-1 == 10 ether)
    // which would incorrectly accept 11 ether (11 - 1 == 10)
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("11")
      })
    ).to.be.reverted;
  });
});