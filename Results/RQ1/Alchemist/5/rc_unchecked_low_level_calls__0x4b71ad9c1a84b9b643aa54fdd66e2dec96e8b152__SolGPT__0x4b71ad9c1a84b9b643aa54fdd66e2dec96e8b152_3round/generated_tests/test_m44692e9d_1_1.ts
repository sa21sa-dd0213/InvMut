import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant detection - m44692e9d", function () {
  it("should revert when calling transfer with non-empty _tos array (mutant changes > to <)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const tokenAddress = addr1.address;
    const recipients = [addr2.address];

    await expect(
      instance.transfer(owner.address, tokenAddress, recipients, ethers.parseEther("1"))
    ).to.be.reverted;
  });
});