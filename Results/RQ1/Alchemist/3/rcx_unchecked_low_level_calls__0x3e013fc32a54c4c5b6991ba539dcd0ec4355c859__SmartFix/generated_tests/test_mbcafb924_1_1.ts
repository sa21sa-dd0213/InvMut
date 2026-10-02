import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 - kill mutant mbcafb924", function () {
  it("should revert on mutant when msg.value = type(uint256).max - 1 and balance = 1", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with 1 wei
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: 1
    });

    // Prepare data for multiplicate call
    const data = "0x";

    // msg.value = type(uint256).max - 1
    const largeValue = ethers.MaxUint256 - 1n;

    // This should revert on the mutant due to overflow, but pass on the original
    await expect(
      instance.connect(addr1).multiplicate(addr1.address, { value: largeValue })
    ).to.be.reverted;
  });
});