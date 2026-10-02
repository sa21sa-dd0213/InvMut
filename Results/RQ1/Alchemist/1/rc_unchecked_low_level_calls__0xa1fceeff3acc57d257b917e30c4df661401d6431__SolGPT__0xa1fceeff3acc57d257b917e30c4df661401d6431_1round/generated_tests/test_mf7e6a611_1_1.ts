import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant test - kill mf7e6a611", function () {
  it("should revert when contract_address is address(0) due to validAddress modifier", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const tos = [addr1.address];
    const vs = [ethers.parseEther("1")];

    // Attempt to call transfer with address(0) as contract_address
    // Original contract reverts because of require(addr != address(0x0)) in validAddress modifier
    await expect(
      instance.transfer(ethers.ZeroAddress, tos, vs)
    ).to.be.reverted;
  });
});