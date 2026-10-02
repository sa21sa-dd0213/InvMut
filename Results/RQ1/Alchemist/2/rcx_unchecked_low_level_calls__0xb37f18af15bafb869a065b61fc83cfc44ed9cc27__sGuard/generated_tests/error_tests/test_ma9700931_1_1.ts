import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant ma9700931: non-owner should be reverted when calling sendMoney on original but succeed on mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the wallet so it has balance to send
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Non-owner (addr1) tries to call sendMoney - should revert on original
    await expect(
      instance.connect(addr1).sendMoney(addr2.address, ethers.parseEther("0.5"))
    ).to.be.reverted;

    // Owner can still call sendMoney successfully
    await expect(
      instance.connect(owner).sendMoney(addr2.address, ethers.parseEther("0.5"))
    ).to.not.be.reverted;
  });
});