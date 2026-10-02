import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant m1b39361e - onlyOwner modifier", function () {
  it("should revert when non-owner calls withdrawAll after removing require check", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to call withdrawAll from non-owner address
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.be.revertedWith(""); // empty revert reason since require was removed
  });

  it("should revert when non-owner calls withdraw after removing require check", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    await expect(
      instance.connect(addr1).withdraw(100)
    ).to.be.revertedWith("");
  });

  it("should revert when non-owner calls sendMoney after removing require check", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    await expect(
      instance.connect(addr1).sendMoney(addr2.address, 100)
    ).to.be.revertedWith("");
  });
});