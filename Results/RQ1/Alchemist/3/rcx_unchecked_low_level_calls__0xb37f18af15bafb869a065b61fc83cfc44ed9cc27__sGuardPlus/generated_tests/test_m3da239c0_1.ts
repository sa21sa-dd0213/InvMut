import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet - Mutant m3da239c0 (sendMoney modifier removed)", function () {
  it("should revert when non-owner calls sendMoney on original contract, but mutant would allow it", async function () {
    const [owner, nonOwner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Non-owner attempts to call sendMoney - should revert with onlyOwner modifier
    await expect(
      instance.connect(nonOwner).sendMoney(nonOwner.address, ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});