import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant test - m4438f23f", function () {
  it("should revert when non-owner calls withdraw", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so withdraw has balance to transfer
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attempt to call withdraw from non-owner address
    await expect(
      instance.connect(addr1).withdraw(ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});