import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when contract_address is the contract itself (mutant kill test)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const contractAddress = await instance.getAddress();
    const tos = [addr1.address];
    const vs = [ethers.parseEther("1")];

    // This call should revert because the validAddress modifier should reject the contract's own address
    await expect(
      instance.transfer(contractAddress, tos, vs)
    ).to.be.reverted;
  });
});