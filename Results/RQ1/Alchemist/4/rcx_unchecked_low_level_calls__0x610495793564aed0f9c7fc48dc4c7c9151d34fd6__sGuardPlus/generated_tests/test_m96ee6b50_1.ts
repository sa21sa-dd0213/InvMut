import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant m96ee6b50 test", function () {
  it("should revert when non-owner calls withdraw", async function () {
    const [owner, nonOwner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether so there's something to withdraw
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Non-owner attempts to withdraw
    await expect(
      instance.connect(nonOwner).withdraw(ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});