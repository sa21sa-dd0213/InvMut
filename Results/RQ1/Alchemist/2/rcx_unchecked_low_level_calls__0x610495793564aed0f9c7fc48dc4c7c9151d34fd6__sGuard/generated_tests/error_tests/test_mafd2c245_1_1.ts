import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet - Kill mutant mafd2c245 (inverted onlyOwner modifier)", function () {
  it("should allow owner to call withdrawAll and succeed, killing mutant where owner is blocked", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract so withdrawAll has balance to transfer
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Owner calls withdrawAll - should succeed on original, revert on mutant
    await expect(instance.connect(owner).withdrawAll()).to.not.be.reverted;
  });

  it("should allow owner to call withdraw and succeed, killing mutant where owner is blocked", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Owner calls withdraw with value
    await expect(instance.connect(owner).withdraw(ethers.parseEther("0.5"))).to.not.be.reverted;
  });

  it("should allow owner to call sendMoney and succeed, killing mutant where owner is blocked", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Owner calls sendMoney
    await expect(
      instance.connect(owner).sendMoney(addr1.address, ethers.parseEther("0.5"), "0x")
    ).to.not.be.reverted;
  });
});