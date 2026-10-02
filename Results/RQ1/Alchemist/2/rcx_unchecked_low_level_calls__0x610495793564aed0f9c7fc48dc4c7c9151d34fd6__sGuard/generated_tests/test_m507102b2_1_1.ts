import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet - kill mutant m507102b2", function () {
  it("should revert when unauthorized user calls withdrawAll", async function () {
    const [owner, unauthorized] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so there's balance to withdraw
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Unauthorized address should not be able to call withdrawAll
    await expect(
      instance.connect(unauthorized).withdrawAll()
    ).to.be.revertedWith("onlyOwner");
  });
});