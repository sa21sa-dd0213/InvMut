import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant kill test", function () {
  it("should kill mutant me5ff4b17 by sending non-zero value to multiplicate and expecting revert", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some initial balance
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Send a non-zero value to multiplicate - should revert on mutant
    await expect(
      instance.connect(owner).multiplicate(addr1.address, { value: ethers.parseEther("0.5") })
    ).to.be.reverted;
  });
});