import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant m1c495a33 detection test", function () {
  it("should revert when contract_address equals this contract address (original behavior)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The contract's own address
    const contractAddress = await instance.getAddress();

    // Prepare dummy arrays for the transfer call
    const tos = [addr1.address];
    const vs = [ethers.parseEther("1")];

    // In the original contract, calling transfer with contract_address == address(this) should revert
    // The mutant changes require(addr != address(this)) to require(addr == address(this))
    // which would make this call succeed instead of revert, thus killing the mutant
    await expect(
      instance.connect(owner).transfer(contractAddress, tos, vs)
    ).to.be.reverted;
  });
});