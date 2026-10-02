import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6)", function () {
  it("should prevent non-owner from calling sendMoney (mutant detection)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the wallet so it has balance to send
    const fundAmount = ethers.parseEther("1");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });

    // Non-owner attempts to call sendMoney - should revert in original, pass in mutant
    await expect(
      instance.connect(addr1).sendMoney(addr1.address, ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});