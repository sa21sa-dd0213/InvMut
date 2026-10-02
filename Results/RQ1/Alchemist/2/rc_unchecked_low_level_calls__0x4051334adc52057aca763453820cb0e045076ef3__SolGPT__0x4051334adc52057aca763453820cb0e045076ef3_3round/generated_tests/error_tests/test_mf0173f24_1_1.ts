import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when _tos array is empty (kill mutant mf0173f24)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airdrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const emptyAddresses: string[] = [];
    const tokenAddress = addr1.address;
    const value = ethers.parseEther("1");

    await expect(
      instance.transfer(owner.address, tokenAddress, emptyAddresses, value)
    ).to.be.reverted;
  });
});