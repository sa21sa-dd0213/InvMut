import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant detection", function () {
  it("should revert when owner calls withdrawAll due to mutant modifier change", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so balance is non-zero for withdrawAll
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Owner calls withdrawAll - should succeed in original, revert in mutant
    // because modifier requires msg.sender != owner (mutant) instead of msg.sender == owner
    await expect(
      instance.connect(owner).withdrawAll()
    ).to.be.reverted;
  });
});