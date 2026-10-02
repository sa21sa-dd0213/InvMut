import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant kill test - m4438f23f", function () {
  it("should revert when non-owner tries to withdraw", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so there is something to withdraw
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // addr1 (non-owner) attempts to withdraw 0.5 ether
    await expect(
      instance.connect(addr1).withdraw(ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});