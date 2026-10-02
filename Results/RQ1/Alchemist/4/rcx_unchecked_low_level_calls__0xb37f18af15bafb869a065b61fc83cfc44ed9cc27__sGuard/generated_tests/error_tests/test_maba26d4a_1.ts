import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet - Kill mutant maba26d4a (onlyOwner modifier removed)", function () {
  it("should revert when non-owner tries to call withdrawAll (mutant lacks require check)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethert.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ETH so withdrawAll has something to send
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Non-owner attempts to call withdrawAll - should revert in original, succeed in mutant
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.be.revertedWith(""); // Revert reason may vary; empty string catches any revert
  });

  it("should revert when non-owner tries to call withdraw (mutant lacks require check)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund contract so withdraw has balance to send
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Non-owner attempts to call withdraw(0) - should revert in original
    await expect(
      instance.connect(addr1).withdraw(ethers.parseEther("0.5"))
    ).to.be.revertedWith("");
  });

  it("should revert when non-owner tries to call sendMoney (mutant lacks require check)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund contract
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Non-owner attempts to call sendMoney - should revert in original
    await expect(
      instance.connect(addr1).sendMoney(addr2.address, ethers.parseEther("0.5"))
    ).to.be.revertedWith("");
  });
});