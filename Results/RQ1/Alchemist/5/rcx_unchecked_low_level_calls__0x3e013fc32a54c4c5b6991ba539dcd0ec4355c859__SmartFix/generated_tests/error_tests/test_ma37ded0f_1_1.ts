import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant ma37ded0f", function () {
  it("should revert when non-owner calls withdraw after mutant removes owner check", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so there is balance to withdraw
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Attempt to withdraw from non-owner address - should revert in original but succeed in mutant
    await expect(
      instance.connect(addr1).withdraw()
    ).to.be.reverted;
  });
});