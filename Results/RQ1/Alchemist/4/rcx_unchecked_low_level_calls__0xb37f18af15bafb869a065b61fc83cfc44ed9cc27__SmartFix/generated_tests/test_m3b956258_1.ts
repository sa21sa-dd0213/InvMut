import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet - kill mutant m3b956258", function () {
  it("should revert when non-owner calls withdrawAll (onlyOwner modifier missing in mutant)", async function () {
    const [owner, nonOwner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the wallet so there is balance to withdraw
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Non-owner should not be able to call withdrawAll
    await expect(
      instance.connect(nonOwner).withdrawAll()
    ).to.be.reverted;
  });
});