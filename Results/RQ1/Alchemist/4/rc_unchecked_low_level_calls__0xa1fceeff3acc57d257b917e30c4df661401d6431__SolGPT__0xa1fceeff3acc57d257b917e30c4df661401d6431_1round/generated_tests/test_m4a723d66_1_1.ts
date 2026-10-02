import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant m4a723d66", function () {
  it("should revert when contract address is set to the contract itself in the original, but passes in the mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Prepare arrays for the transfer call - these can be minimal valid arrays
    const tos = [addr1.address];
    const vs = [100];

    // Call transfer with the contract's own address as contract_address
    // In the original this should revert due to the require(addr != address(this)) check
    // In the mutant this check is removed so it will proceed (and likely fail on the inner call)
    await expect(
      instance.transfer(await instance.getAddress(), tos, vs)
    ).to.be.reverted;
  });
});