import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant m9cfb03ab test", function () {
  it("should revert when contract_address is set to the contract's own address (kills mutant that removes validAddress modifier)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const contractAddress = await instance.getAddress();
    const tos = [addr1.address];
    const vs = [100];

    await expect(
      instance.transfer(contractAddress, tos, vs)
    ).to.be.reverted;
  });
});