import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant test - m3da239c0", function () {
  it("should revert when non-owner calls sendMoney (onlyOwner modifier removed in mutant)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the wallet with some ether so we can test sending
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // addr1 (non-owner) attempts to call sendMoney - should revert in original, pass in mutant
    await expect(
      instance.connect(addr1).sendMoney(addr1.address, ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});