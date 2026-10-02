import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant kill test - sendMoney without onlyOwner", function () {
  it("should revert when non-owner calls sendMoney on original contract", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const value = ethers.parseEther("0.1");
    const target = addr1.address;
    const data = "0x";

    // Fund the contract so it has balance to send
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });

    // Attempt to call sendMoney from non-owner address - should revert
    await expect(
      instance.connect(addr1).sendMoney(target, value, data)
    ).to.be.reverted;
  });
});