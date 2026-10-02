import { expect } from "chai";
import { ethers } } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when non-owner calls withdrawAll (kills mutant that removes onlyOwner require)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 (not owner) tries to call withdrawAll - should revert in original, succeed in mutant
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.be.reverted;
  });

  it("should revert when non-owner calls withdraw (kills mutant that removes onlyOwner require)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    await expect(
      instance.connect(addr1).withdraw(ethers.parseEther("1"))
    ).to.be.reverted;
  });

  it("should revert when non-owner calls sendMoney (kills mutant that removes onlyOwner require)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    await expect(
      instance.connect(addr1).sendMoney(addr2.address, ethers.parseEther("1"), "0x")
    ).to.be.reverted;
  });
});