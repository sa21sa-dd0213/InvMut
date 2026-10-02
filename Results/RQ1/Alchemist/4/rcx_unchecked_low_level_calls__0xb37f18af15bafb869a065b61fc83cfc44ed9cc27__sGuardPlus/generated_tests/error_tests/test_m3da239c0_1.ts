import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6)", function () {
  it("should reject sendMoney from non-owner (kill mutant m3da239c0)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ETH for the sendMoney call
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Non-owner tries to call sendMoney - should revert on original, pass on mutant
    await expect(
      instance.connect(addr1).sendMoney(addr1.address, ethers.parseEther("0.5"))
    ).to.be.reverted;
  });
});