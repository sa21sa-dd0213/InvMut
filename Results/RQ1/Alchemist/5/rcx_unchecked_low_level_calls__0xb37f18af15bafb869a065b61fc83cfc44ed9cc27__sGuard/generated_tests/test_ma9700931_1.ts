import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant ma9700931 test", function () {
  it("should revert when non-owner calls sendMoney", async function () {
    const [owner, nonOwner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the wallet so it has balance to send
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Non-owner tries to call sendMoney - should revert on original, succeed on mutant
    await expect(
      instance.connect(nonOwner).sendMoney(nonOwner.address, ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});