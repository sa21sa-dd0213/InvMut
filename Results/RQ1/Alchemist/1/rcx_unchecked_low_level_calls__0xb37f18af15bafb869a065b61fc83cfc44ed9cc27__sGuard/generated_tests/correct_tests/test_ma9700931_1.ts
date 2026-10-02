import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant test - ma9700931", function () {
  it("should revert when non-owner calls sendMoney", async function () {
    const [owner, nonOwner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so it has balance to send
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attempt to call sendMoney from a non-owner address - should revert in original
    await expect(
      instance.connect(nonOwner).sendMoney(
        nonOwner.address,
        ethers.parseEther("0.5")
      )
    ).to.be.reverted;
  });
});