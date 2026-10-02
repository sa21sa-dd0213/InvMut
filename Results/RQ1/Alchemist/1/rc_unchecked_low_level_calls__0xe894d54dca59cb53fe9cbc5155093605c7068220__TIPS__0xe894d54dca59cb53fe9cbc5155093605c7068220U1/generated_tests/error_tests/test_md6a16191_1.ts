import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant kill test - empty _tos array", function () {
  it("should revert when _tos array is empty (original behavior), mutant would not revert", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const tokenAddress = ethers.ZeroAddress; // using zero address as placeholder for caddress
    const emptyAddresses: string[] = [];
    const value = 100;
    const decimals = 18;

    // The original contract requires _tos.length > 0, so this should revert
    // The mutant removed the require, so it would not revert (failing the test)
    await expect(
      instance.transfer(owner.address, tokenAddress, emptyAddresses, value, decimals)
    ).to.be.reverted;
  });
});