import { expect } from "chai";
import { ethers } } from "hardhat";

describe("SimpleWallet mutant test - remove onlyOwner from withdraw", function () {
  it("should revert when non-owner tries to call withdraw", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so there is balance to withdraw
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // addr1 is not the owner, so withdraw should revert
    await expect(
      instance.connect(addr1).withdraw(ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});