import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant mf01ed52e - onlyOwner modifier", function () {
  it("should revert when non-owner calls withdrawAll after removing require(msg.sender == owner)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the wallet so there is balance to withdraw
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Non-owner tries to call withdrawAll - should revert on original, but succeed on mutant
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.be.reverted;
  });

  it("should revert when non-owner calls withdraw(uint) after removing require(msg.sender == owner)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    await expect(
      instance.connect(addr1).withdraw(ethers.parseEther("0.5"))
    ).to.be.reverted;
  });

  it("should revert when non-owner calls sendMoney after removing require(msg.sender == owner)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    await expect(
      instance.connect(addr1).sendMoney(addr2.address, ethers.parseEther("0.3"))
    ).to.be.reverted;
  });
});