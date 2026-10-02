import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant test - m9cfb03ab", function () {
  it("should revert when contract_address is the contract itself (validAddress modifier check)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Setup: create arrays with one element each (tos and vs)
    const tos = [addr1.address];
    const vs = [100];

    // Attempt to call transfer with contract_address set to the contract's own address
    // Original contract should revert due to validAddress modifier (addr != address(this))
    // Mutant without the modifier would allow the call and potentially fail differently
    await expect(
      instance.transfer(await instance.getAddress(), tos, vs)
    ).to.be.reverted;
  });
});