import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant test - m96b1dac9", function () {
  it("should revert when non-owner calls withdraw", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so there is balance to withdraw
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Attempt to call withdraw from a non-owner address - should revert in original, succeed in mutant
    await expect(
      instance.connect(addr1).withdraw(ethers.parseEther("0.5"))
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });
});