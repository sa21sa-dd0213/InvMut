import { expect } from "chai";
import { ethers } } from "hardhat";

describe("MultiplicatorX3 - Kill mutant m658fe09d", function () {
  it("should revert when non-owner calls Command, but mutant allows it", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so balance checks are not an issue
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Attacker tries to call Command with dummy data, expecting revert on original
    const dummyData = "0x";
    await expect(
      instance.connect(attacker).Command(attacker.address, dummyData, { value: 0 })
    ).to.be.reverted;
  });
});