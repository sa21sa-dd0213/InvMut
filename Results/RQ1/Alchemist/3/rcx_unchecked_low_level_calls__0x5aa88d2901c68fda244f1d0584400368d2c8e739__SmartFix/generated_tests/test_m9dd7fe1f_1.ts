import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 mutant m9dd7fe1f test", function () {
  it("should revert when calling multiplicate with 0 wei (mutant kills itself)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether to ensure balance > 0
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });

    // Call multiplicate with 0 wei - should revert in mutant due to msg.value >= 1 requirement
    await expect(
      instance.connect(owner).multiplicate(addr1.address, { value: 0 })
    ).to.be.reverted;
  });
});