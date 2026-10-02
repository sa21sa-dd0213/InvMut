import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant mc66539c0 test", function () {
  it("should revert when calling create with roundImplementation set to address(0)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy RoundFactory - no constructor arguments needed as it uses initializer pattern
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the contract
    await instance.initialize();

    // Set the owner as a program operator
    await instance.setProgramOperator(owner.address, true);

    // Update roundImplementation to address(0) - this should succeed as onlyOwner
    await instance.updateRoundImplementation(ethers.ZeroAddress);

    // Now try to call create - the original contract should revert due to require check
    // The mutant would not revert and would attempt to clone address(0)
    const encodedParameters = ethers.toUtf8Bytes("0x");

    await expect(
      instance.create(encodedParameters, addr1.address)
    ).to.be.reverted;
  });
});