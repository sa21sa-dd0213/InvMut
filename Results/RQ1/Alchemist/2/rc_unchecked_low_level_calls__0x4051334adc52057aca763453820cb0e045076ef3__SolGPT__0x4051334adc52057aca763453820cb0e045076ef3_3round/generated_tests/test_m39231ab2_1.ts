import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when _tos array is empty (kills mutant m39231ab2)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airdrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const tokenAddress = addr1.address;
    const emptyRecipients: string[] = [];
    const value = ethers.parseEther("1");

    await expect(
      instance.transfer(owner.address, tokenAddress, emptyRecipients, value)
    ).to.be.reverted;
  });
});