import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant mf7e6a611 test", function () {
  it("should revert when contract_address is address(0) in original, but pass in mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const tos = [addr1.address];
    const vs = [100];

    // This call should revert in the original due to validAddress modifier checking for address(0)
    // In the mutant, the require(addr != address(0x0)) is removed, so it will not revert
    await expect(
      instance.transfer(ethers.ZeroAddress, tos, vs)
    ).to.be.reverted;
  });
});