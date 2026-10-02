import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when _tos array is empty (kill mutant mececb232)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const emptyAddresses: string[] = [];
    const emptyValues: bigint[] = [];
    const caddress = addr1.address;

    await expect(
      instance.transfer(owner.address, caddress, emptyAddresses, emptyValues)
    ).to.be.reverted;
  });
});