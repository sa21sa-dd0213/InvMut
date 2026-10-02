import { expect } from "chai";
import { ethers } } from "hardhat";

describe("MultiplicatorX3 mutant test - m658fe09d", function () {
  it("should revert when non-owner calls Command due to missing access control", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so it has some balance for the call
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attacker tries to call Command with arbitrary data
    const targetAddress = attacker.address;
    const dummyData = "0x1234";
    
    await expect(
      instance.connect(attacker).Command(targetAddress, dummyData, { value: ethers.parseEther("0.1") })
    ).to.be.reverted;
  });
});