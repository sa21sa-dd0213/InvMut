import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant test - validAddress modifier change", function () {
  it("should revert when contract_address is set to the contract's own address (mutant expects revert due to == instead of !=)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const contractAddress = await instance.getAddress();

    // Create valid arrays for the transfer call
    const tos = [addr1.address];
    const vs = [100];

    // Calling transfer with contract_address = own address should revert in mutant
    // because the mutant requires addr == address(this) which will be true, but the
    // original requires addr != address(this) which would allow the call.
    // Since the mutant incorrectly enforces equality, it will revert when calling itself.
    await expect(
      instance.transfer(contractAddress, tos, vs)
    ).to.be.reverted;
  });
});