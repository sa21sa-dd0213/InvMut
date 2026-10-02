import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant m825aecd2 test", function () {
  it("should revert when non-owner calls withdrawAll", async function () {
    const [owner, nonOwner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so balance > 0
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Non-owner should not be able to call withdrawAll (original has onlyOwner modifier)
    await expect(
      instance.connect(nonOwner).withdrawAll()
    ).to.be.reverted;
  });
});